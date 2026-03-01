 * Database Layer
 * SQLite with better-sqlite3 for performance
 */

const Database = require('better-sqlite3');
const path = require('path');
const { logger } = require('./logger');

class DatabaseManager {
  constructor(dbPath = './data/moris.db') {
    this.dbPath = path.resolve(dbPath);
    this.db = null;
    this.init();
  }

  init() {
    try {
      // Ensure data directory exists
      const fs = require('fs');
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Open database
      this.db = new Database(this.dbPath);
      
      // Enable WAL mode for better performance
      this.db.pragma('journal_mode = WAL');
      
      logger.info(`Database initialized: ${this.dbPath}`);
      
      // Create tables
      this.createTables();
      
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  createTables() {
    // Agents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT DEFAULT 'idle',
        config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tasks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        agent_id TEXT,
        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 5,
        data TEXT,
        result TEXT,
        error TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      )
    `);

    // Activity logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT,
        task_id TEXT,
        level TEXT DEFAULT 'info',
        message TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      )
    `);

    // Reports table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        data TEXT,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_logs_agent ON activity_logs(agent_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at)');

    logger.info('Database tables created');
  }

  // Agents
  createAgent(agent) {
    const stmt = this.db.prepare(`
      INSERT INTO agents (id, name, role, status, config)
      VALUES (@id, @name, @role, @status, @config)
    `);
    
    const result = stmt.run({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status || 'idle',
      config: JSON.stringify(agent.config || {})
    });
    
    logger.info(`Agent created: ${agent.id}`);
    return result;
  }

  getAgent(id) {
    const stmt = this.db.prepare('SELECT * FROM agents WHERE id = ?');
    const agent = stmt.get(id);
    if (agent) {
      agent.config = JSON.parse(agent.config || '{}');
    }
    return agent;
  }

  getAllAgents() {
    const stmt = this.db.prepare('SELECT * FROM agents ORDER BY created_at DESC');
    const agents = stmt.all();
    return agents.map(a => ({
      ...a,
      config: JSON.parse(a.config || '{}')
    }));
  }

  updateAgent(id, updates) {
    const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    const stmt = this.db.prepare(`
      UPDATE agents SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = @id
    `);
    
    const result = stmt.run({ ...updates, id });
    logger.debug(`Agent updated: ${id}`);
    return result;
  }

  // Tasks
  createTask(task) {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, title, description, agent_id, status, priority, data)
      VALUES (@id, @title, @description, @agent_id, @status, @priority, @data)
    `);
    
    const result = stmt.run({
      id: task.id || `task_${Date.now()}`,
      title: task.title,
      description: task.description || '',
      agent_id: task.agent_id || null,
      status: task.status || 'pending',
      priority: task.priority || 5,
      data: JSON.stringify(task.data || {})
    });
    
    logger.info(`Task created: ${task.title}`);
    return result;
  }

  getTask(id) {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const task = stmt.get(id);
    if (task) {
      task.data = JSON.parse(task.data || '{}');
      task.result = task.result ? JSON.parse(task.result) : null;
    }
    return task;
  }

  getTasks(filters = {}) {
    let query = 'SELECT * FROM tasks';
    const params = [];
    const conditions = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.agent_id) {
      conditions.push('agent_id = ?');
      params.push(filters.agent_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const tasks = stmt.all(...params);
    
    return tasks.map(t => ({
      ...t,
      data: JSON.parse(t.data || '{}'),
      result: t.result ? JSON.parse(t.result) : null
    }));
  }

  updateTask(id, updates) {
    const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    const stmt = this.db.prepare(`
      UPDATE tasks SET ${fields} WHERE id = @id
    `);
    
    // Serialize JSON fields
    if (updates.data) updates.data = JSON.stringify(updates.data);
    if (updates.result) updates.result = JSON.stringify(updates.result);
    
    const result = stmt.run({ ...updates, id });
    logger.debug(`Task updated: ${id}`);
    return result;
  }

  // Activity logs
  logActivity({ agent_id, task_id, level = 'info', message, metadata = {} }) {
    const stmt = this.db.prepare(`
      INSERT INTO activity_logs (agent_id, task_id, level, message, metadata)
      VALUES (@agent_id, @task_id, @level, @message, @metadata)
    `);
    
    return stmt.run({
      agent_id,
      task_id,
      level,
      message,
      metadata: JSON.stringify(metadata)
    });
  }

  getActivityLogs(filters = {}, limit = 100) {
    let query = 'SELECT * FROM activity_logs';
    const params = [];
    const conditions = [];

    if (filters.agent_id) {
      conditions.push('agent_id = ?');
      params.push(filters.agent_id);
    }
    if (filters.level) {
      conditions.push('level = ?');
      params.push(filters.level);
    }
    if (filters.since) {
      conditions.push('created_at > ?');
      params.push(filters.since);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const logs = stmt.all(...params);
    
    return logs.map(l => ({
      ...l,
      metadata: JSON.parse(l.metadata || '{}')
    }));
  }

  // Reports
  generateReport(type, title, data) {
    const stmt = this.db.prepare(`
      INSERT INTO reports (id, type, title, data)
      VALUES (@id, @type, @title, @data)
    `);
    
    const id = `report_${Date.now()}`;
    stmt.run({
      id,
      type,
      title,
      data: JSON.stringify(data)
    });
    
    logger.info(`Report generated: ${title}`);
    return id;
  }

  getReport(id) {
    const stmt = this.db.prepare('SELECT * FROM reports WHERE id = ?');
    const report = stmt.get(id);
    if (report) {
      report.data = JSON.parse(report.data || '{}');
    }
    return report;
  }

  getReports(type = null, limit = 50) {
    let query = 'SELECT * FROM reports';
    const params = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY generated_at DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const reports = stmt.all(...params);
    
    return reports.map(r => ({
      ...r,
      data: JSON.parse(r.data || '{}')
    }));
  }

  // Statistics
  getStats() {
    const stats = {
      agents: this.db.prepare('SELECT COUNT(*) as count FROM agents').get(),
      tasks: this.db.prepare('SELECT COUNT(*) as count FROM tasks').get(),
      tasks_by_status: this.db.prepare(`
        SELECT status, COUNT(*) as count FROM tasks GROUP BY status
      `).all(),
      recent_activity: this.db.prepare(`
        SELECT COUNT(*) as count FROM activity_logs 
        WHERE created_at > datetime('now', '-24 hours')
      `).get(),
      logs_by_level: this.db.prepare(`
        SELECT level, COUNT(*) as count FROM activity_logs GROUP BY level
      `).all()
    };
    
    return stats;
  }

  close() {
    if (this.db) {
      this.db.close();
      logger.info('Database connection closed');
    }
  }
}

module.exports = { DatabaseManager };