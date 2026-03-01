/**
 * MORIS API Client
 * JavaScript client for MORIS API
 */

class MorisClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost';
    this.apiKey = config.apiKey || null;
    this.timeout = config.timeout || 30000;
  }

  // Set API key
  setApiKey(key) {
    this.apiKey = key;
  }

  // Make HTTP request
  async request(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'X-API-Key': this.apiKey })
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    options.signal = controller.signal;

    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  // Health check
  async health() {
    return this.request('GET', '/health');
  }

  // System stats
  async stats() {
    return this.request('GET', '/api/stats');
  }

  // ===== AGENTS =====
  
  // List agents
  async listAgents() {
    return this.request('GET', '/api/agents');
  }

  // Get agent
  async getAgent(id) {
    return this.request('GET', `/api/agents/${id}`);
  }

  // ===== TASKS =====
  
  // List tasks
  async listTasks(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/api/tasks${params ? '?' + params : ''}`);
  }

  // Create task
  async createTask(task) {
    return this.request('POST', '/api/tasks', task);
  }

  // Get task
  async getTask(id) {
    return this.request('GET', `/api/tasks/${id}`);
  }

  // ===== REPORTS =====
  
  // List reports
  async listReports(type = null) {
    const params = type ? `?type=${type}` : '';
    return this.request('GET', `/api/reports${params}`);
  }

  // Generate report
  async generateReport(type = 'dashboard') {
    return this.request('POST', '/api/reports', { type });
  }

  // Get report
  async getReport(id) {
    return this.request('GET', `/api/reports/${id}`);
  }

  // ===== LOGS =====
  
  // Get logs
  async getLogs(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/api/logs${params ? '?' + params : ''}`);
  }

  // ===== WORKFLOWS =====
  
  // Start workflow
  async startWorkflow(templateId, inputs = {}) {
    return this.request('POST', '/api/workflows', { templateId, inputs });
  }

  // List workflows
  async listWorkflows() {
    return this.request('GET', '/api/workflows');
  }

  // ===== BACKUPS =====
  
  // Create backup
  async createBackup(type = 'full') {
    return this.request('POST', '/api/backups', { type });
  }

  // List backups
  async listBackups() {
    return this.request('GET', '/api/backups');
  }

  // Restore backup
  async restoreBackup(backupId) {
    return this.request('POST', `/api/backups/${backupId}/restore`);
  }

  // ===== WEBSOCKET =====
  
  // Connect to WebSocket
  connectWebSocket(onMessage, channels = ['all']) {
    const wsUrl = this.baseUrl.replace('http', 'ws') + '/ws';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({ type: 'subscribe', data: channels }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      onMessage(message);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return ws;
  }
}

// Usage example:
// const client = new MorisClient({ baseUrl: 'http://localhost', apiKey: 'your-key' });
// const agents = await client.listAgents();

module.exports = { MorisClient };