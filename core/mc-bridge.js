/**
 * Mission Control Bridge
 * Connects Moris autonomous agent to Mission Control dashboard
 * via the Direct CLI Integration API.
 * 
 * Features:
 * - Agent registration & heartbeat
 * - SSE event listener for real-time task assignments
 * - Task CRUD (create, list, update, broadcast)
 * - Inter-agent messaging
 */

const http = require('http');
const https = require('https');
const { EventEmitter } = require('events');

class MCBridge extends EventEmitter {
    /**
     * @param {object} options
     * @param {string} options.mcUrl - Mission Control base URL (e.g. http://host:3000)
     * @param {string} options.apiKey - MC API key for authentication
     * @param {string} [options.agentName='Moris'] - Agent name to register
     * @param {string} [options.agentRole='orchestrator'] - Agent role
     * @param {number} [options.heartbeatInterval=30000] - Heartbeat interval in ms
     */
    constructor(options = {}) {
        super();
        this.mcUrl = (options.mcUrl || '').replace(/\/$/, '');
        this.apiKey = options.apiKey || '';
        this.agentName = options.agentName || 'Moris';
        this.agentRole = options.agentRole || 'orchestrator';
        this.heartbeatInterval = options.heartbeatInterval || 30000;

        this.connectionId = null;
        this.agentId = null;
        this.heartbeatTimer = null;
        this.sseRequest = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 5000;
    }

    // ── HTTP helpers ──────────────────────────────────────────────

    _request(method, path, body = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.mcUrl);
            const isHttps = url.protocol === 'https:';
            const lib = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method,
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            };

            const req = lib.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(json);
                        } else {
                            reject(new Error(`MC API ${method} ${path} → ${res.statusCode}: ${data}`));
                        }
                    } catch {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve({ raw: data, status: res.statusCode });
                        } else {
                            reject(new Error(`MC API ${method} ${path} → ${res.statusCode}: ${data}`));
                        }
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`MC API ${method} ${path} → timeout`));
            });

            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }

    // ── Connection lifecycle ──────────────────────────────────────

    /**
     * Register Moris as an agent in Mission Control and start heartbeat + SSE.
     */
    async connect() {
        if (!this.mcUrl || !this.apiKey) {
            console.log('[MC Bridge] MC_URL or MC_API_KEY not set — skipping MC integration');
            return false;
        }

        try {
            console.log(`[MC Bridge] Connecting to ${this.mcUrl} as "${this.agentName}"...`);

            const result = await this._request('POST', '/api/connect', {
                tool_name: 'moris-autonomous',
                tool_version: '2.0.0',
                agent_name: this.agentName,
                agent_role: this.agentRole,
            });

            this.connectionId = result.connection_id;
            this.agentId = result.agent_id;
            this.connected = true;
            this.reconnectAttempts = 0;

            console.log(`[MC Bridge] ✅ Connected — agent_id=${this.agentId}, connection_id=${this.connectionId}`);

            // Start heartbeat loop
            this._startHeartbeat();

            // Start SSE event listener
            this._startSSE();

            this.emit('connected', { agentId: this.agentId, connectionId: this.connectionId });
            return true;
        } catch (err) {
            console.error(`[MC Bridge] ❌ Connection failed: ${err.message}`);
            this._scheduleReconnect();
            return false;
        }
    }

    /**
     * Disconnect from Mission Control.
     */
    async disconnect() {
        if (!this.connected) return;

        // Stop heartbeat
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        // Stop SSE
        if (this.sseRequest) {
            this.sseRequest.destroy();
            this.sseRequest = null;
        }

        // Deregister
        try {
            await this._request('DELETE', '/api/connect', {
                connection_id: this.connectionId,
            });
            console.log('[MC Bridge] Disconnected from Mission Control');
        } catch (err) {
            console.error(`[MC Bridge] Disconnect error: ${err.message}`);
        }

        this.connected = false;
        this.connectionId = null;
        this.agentId = null;
        this.emit('disconnected');
    }

    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[MC Bridge] Max reconnect attempts reached — giving up');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 6);
        console.log(`[MC Bridge] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts})...`);

        setTimeout(() => this.connect(), delay);
    }

    // ── Heartbeat ─────────────────────────────────────────────────

    _startHeartbeat() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

        this.heartbeatTimer = setInterval(async () => {
            try {
                const result = await this._request('POST', `/api/agents/${this.agentId}/heartbeat`, {
                    connection_id: this.connectionId,
                });

                // Heartbeat response includes pending work items
                if (result.work_items && result.work_items.length > 0) {
                    this.emit('work_items', result.work_items);
                }
            } catch (err) {
                console.error(`[MC Bridge] Heartbeat failed: ${err.message}`);
                // If heartbeat fails repeatedly, try to reconnect
                if (!this.connected) return;
                this.connected = false;
                this._scheduleReconnect();
            }
        }, this.heartbeatInterval);

        // Don't keep process alive just for heartbeat
        this.heartbeatTimer.unref?.();
    }

    // ── SSE event listener ────────────────────────────────────────

    _startSSE() {
        try {
            const url = new URL('/api/events', this.mcUrl);
            const isHttps = url.protocol === 'https:';
            const lib = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'GET',
                headers: {
                    'x-api-key': this.apiKey,
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                },
            };

            this.sseRequest = lib.request(options, (res) => {
                if (res.statusCode !== 200) {
                    console.error(`[MC Bridge] SSE connection failed: ${res.statusCode}`);
                    return;
                }

                console.log('[MC Bridge] 📡 SSE connected — listening for events');

                let buffer = '';
                res.on('data', (chunk) => {
                    buffer += chunk.toString();

                    // Parse SSE events (separated by double newline)
                    const events = buffer.split('\n\n');
                    buffer = events.pop(); // Keep incomplete event in buffer

                    for (const eventStr of events) {
                        if (!eventStr.trim()) continue;
                        this._parseSSEEvent(eventStr);
                    }
                });

                res.on('end', () => {
                    console.log('[MC Bridge] SSE connection closed');
                    // Reconnect SSE after a short delay
                    if (this.connected) {
                        setTimeout(() => this._startSSE(), 3000);
                    }
                });

                res.on('error', (err) => {
                    console.error(`[MC Bridge] SSE error: ${err.message}`);
                });
            });

            this.sseRequest.on('error', (err) => {
                console.error(`[MC Bridge] SSE request error: ${err.message}`);
            });

            this.sseRequest.end();
        } catch (err) {
            console.error(`[MC Bridge] SSE setup error: ${err.message}`);
        }
    }

    _parseSSEEvent(eventStr) {
        const lines = eventStr.split('\n');
        let eventType = 'message';
        let data = '';

        for (const line of lines) {
            if (line.startsWith('event:')) {
                eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
                data += line.slice(5).trim();
            }
        }

        if (!data) return;

        try {
            const parsed = JSON.parse(data);
            this.emit('sse_event', { type: eventType, data: parsed });

            // Emit specific events for convenience
            switch (eventType) {
                case 'task:assigned':
                case 'task:created':
                case 'task:updated':
                    this.emit('task_event', { type: eventType, task: parsed });
                    break;
                case 'agent:mention':
                    this.emit('mention', parsed);
                    break;
                case 'message':
                    this.emit('agent_message', parsed);
                    break;
            }
        } catch {
            // Non-JSON data, emit as raw
            this.emit('sse_event', { type: eventType, data });
        }
    }

    // ── Task management ───────────────────────────────────────────

    /**
     * Create a task on the MC task board.
     * @param {object} task
     * @param {string} task.title - Task title
     * @param {string} [task.description] - Task description
     * @param {string} [task.assigned_to] - Agent name to assign to
     * @param {string} [task.priority] - 'low' | 'medium' | 'high' | 'critical'
     * @param {string} [task.status] - 'inbox' | 'backlog' | 'todo' | 'in-progress' | 'review' | 'done'
     */
    async createTask(task) {
        if (!this.connected) throw new Error('Not connected to Mission Control');

        return this._request('POST', '/api/tasks', {
            title: task.title,
            description: task.description || '',
            assigned_to: task.assigned_to || null,
            priority: task.priority || 'medium',
            status: task.status || 'inbox',
        });
    }

    /**
     * List tasks from MC task board.
     * @param {object} [filters]
     * @param {string} [filters.status] - Filter by status
     * @param {string} [filters.assigned_to] - Filter by assignee
     * @param {string} [filters.priority] - Filter by priority
     */
    async listTasks(filters = {}) {
        if (!this.connected) throw new Error('Not connected to Mission Control');

        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.assigned_to) params.set('assigned_to', filters.assigned_to);
        if (filters.priority) params.set('priority', filters.priority);

        const qs = params.toString();
        return this._request('GET', `/api/tasks${qs ? '?' + qs : ''}`);
    }

    /**
     * Update a task on the MC task board.
     * @param {number|string} taskId
     * @param {object} updates - Fields to update (title, description, status, priority, assigned_to)
     */
    async updateTask(taskId, updates) {
        if (!this.connected) throw new Error('Not connected to Mission Control');
        return this._request('PUT', `/api/tasks/${taskId}`, updates);
    }

    /**
     * Broadcast a task to all agents.
     * @param {number|string} taskId
     */
    async broadcastTask(taskId) {
        if (!this.connected) throw new Error('Not connected to Mission Control');
        return this._request('POST', `/api/tasks/${taskId}/broadcast`);
    }

    // ── Agent management ──────────────────────────────────────────

    /**
     * List all agents registered in Mission Control.
     */
    async listAgents() {
        if (!this.connected) throw new Error('Not connected to Mission Control');
        return this._request('GET', '/api/agents');
    }

    /**
     * Send a message to another agent.
     * @param {string} toAgent - Target agent name or ID
     * @param {string} message - Message content
     */
    async sendMessage(toAgent, message) {
        if (!this.connected) throw new Error('Not connected to Mission Control');
        return this._request('POST', '/api/agents/message', {
            to: toAgent,
            from: this.agentName,
            message,
        });
    }

    /**
     * Get messages sent to this agent.
     */
    async getMessages() {
        if (!this.connected) throw new Error('Not connected to Mission Control');
        return this._request('GET', '/api/agents/comms');
    }

    // ── Status ────────────────────────────────────────────────────

    getStatus() {
        return {
            connected: this.connected,
            mcUrl: this.mcUrl,
            agentId: this.agentId,
            agentName: this.agentName,
            connectionId: this.connectionId,
            reconnectAttempts: this.reconnectAttempts,
        };
    }
}

module.exports = { MCBridge };
