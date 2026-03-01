/**
 * Reporting System
 * Generate, store, and export reports
 */

const { logger } = require('./logger');
const fs = require('fs');
const path = require('path');

class ReportingSystem {
  constructor(db) {
    this.db = db;
    this.reportsDir = path.join(process.cwd(), 'reports');
    this.ensureReportsDir();
  }

  ensureReportsDir() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  // Generate comprehensive dashboard report
  async generateDashboardReport() {
    const stats = this.db.getStats();
    const recentTasks = this.db.getTasks({}, 20);
    const recentLogs = this.db.getActivityLogs({}, 50);

    const report = {
      generated_at: new Date().toISOString(),
      summary: {
        total_agents: stats.agents.count,
        total_tasks: stats.tasks.count,
        tasks_by_status: stats.tasks_by_status,
        recent_activity_24h: stats.recent_activity.count
      },
      performance: {
        task_completion_rate: this.calculateCompletionRate(stats.tasks_by_status),
        error_rate: this.calculateErrorRate(stats.logs_by_level),
        avg_tasks_per_agent: stats.agents.count > 0 ? 
          (stats.tasks.count / stats.agents.count).toFixed(2) : 0
      },
      recent_activity: {
        tasks: recentTasks,
        logs: recentLogs
      },
      charts_data: {
        task_status_distribution: stats.tasks_by_status,
        log_level_distribution: stats.logs_by_level,
        hourly_activity: await this.getHourlyActivity()
      }
    };

    // Save to database
    const reportId = this.db.generateReport('dashboard', 'Dashboard Overview', report);

    // Export to JSON
    await this.exportToJSON(report, `dashboard-${Date.now()}`);

    logger.info('Dashboard report generated:', reportId);
    return { reportId, report };
  }

  // Generate agent performance report
  async generateAgentReport(agentId) {
    const agent = this.db.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const tasks = this.db.getTasks({ agent_id: agentId });
    const logs = this.db.getActivityLogs({ agent_id: agentId }, 100);

    const report = {
      generated_at: new Date().toISOString(),
      agent: {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        status: agent.status,
        created_at: agent.created_at
      },
      task_summary: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        pending: tasks.filter(t => t.status === 'pending').length,
        failed: tasks.filter(t => t.status === 'failed').length,
        running: tasks.filter(t => t.status === 'running').length
      },
      performance_metrics: {
        success_rate: this.calculateAgentSuccessRate(tasks),
        avg_completion_time: this.calculateAvgCompletionTime(tasks),
        activity_level: logs.length
      },
      recent_tasks: tasks.slice(0, 10),
      recent_logs: logs.slice(0, 20)
    };

    const reportId = this.db.generateReport('agent', `Agent Report: ${agent.name}`, report);
    
    return { reportId, report };
  }

  // Generate system health report
  async generateHealthReport() {
    const stats = this.db.getStats();
    
    // Check for issues
    const issues = [];
    const failedTasks = stats.tasks_by_status.find(s => s.status === 'failed');
    
    if (failedTasks && failedTasks.count > 10) {
      issues.push({
        severity: 'warning',
        message: `High number of failed tasks: ${failedTasks.count}`,
        recommendation: 'Review agent configurations and error logs'
      });
    }

    const errorLogs = stats.logs_by_level.find(l => l.level === 'error');
    if (errorLogs && errorLogs.count > 50) {
      issues.push({
        severity: 'critical',
        message: `High error rate: ${errorLogs.count} errors`,
        recommendation: 'Investigate system stability immediately'
      });
    }

    const report = {
      generated_at: new Date().toISOString(),
      status: issues.length === 0 ? 'healthy' : (issues.some(i => i.severity === 'critical') ? 'critical' : 'warning'),
      issues: issues,
      metrics: {
        agents: stats.agents.count,
        tasks: stats.tasks.count,
        logs_24h: stats.recent_activity.count
      },
      recommendations: this.generateRecommendations(stats)
    };

    const reportId = this.db.generateReport('health', 'System Health Report', report);
    
    return { reportId, report };
  }

  // Export to CSV
  async exportToCSV(data, filename) {
    const filepath = path.join(this.reportsDir, `${filename}.csv`);
    
    // Convert data to CSV format
    if (Array.isArray(data)) {
      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map(row => 
        Object.values(row).map(v => 
          typeof v === 'object' ? JSON.stringify(v) : v
        ).join(',')
      );
      
      const csv = [headers, ...rows].join('\n');
      fs.writeFileSync(filepath, csv);
    }
    
    logger.info(`Report exported to CSV: ${filepath}`);
    return filepath;
  }

  // Export to JSON
  async exportToJSON(data, filename) {
    const filepath = path.join(this.reportsDir, `${filename}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    
    logger.info(`Report exported to JSON: ${filepath}`);
    return filepath;
  }

  // Export to Markdown
  async exportToMarkdown(report, filename) {
    const filepath = path.join(this.reportsDir, `${filename}.md`);
    
    let md = `# ${report.title || 'Report'}\n\n`;
    md += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Add content based on report type
    if (report.summary) {
      md += '## Summary\n\n';
      md += `- Total Agents: ${report.summary.total_agents}\n`;
      md += `- Total Tasks: ${report.summary.total_tasks}\n`;
      md += `- Recent Activity (24h): ${report.summary.recent_activity_24h}\n\n`;
    }
    
    if (report.performance) {
      md += '## Performance\n\n';
      md += `- Completion Rate: ${report.performance.task_completion_rate}%\n`;
      md += `- Error Rate: ${report.performance.error_rate}%\n`;
      md += `- Avg Tasks/Agent: ${report.performance.avg_tasks_per_agent}\n\n`;
    }

    fs.writeFileSync(filepath, md);
    
    logger.info(`Report exported to Markdown: ${filepath}`);
    return filepath;
  }

  // Get hourly activity data for charts
  async getHourlyActivity() {
    const hours = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(Date.now() - i * 60 * 60 * 1000);
      const since = hour.toISOString();
      const until = new Date(hour.getTime() + 60 * 60 * 1000).toISOString();
      
      // This is a simplified version - in production use proper SQL aggregation
      hours.push({
        hour: hour.getHours(),
        tasks: Math.floor(Math.random() * 10), // Placeholder
        logs: Math.floor(Math.random() * 50) // Placeholder
      });
    }
    return hours;
  }

  // Helper calculations
  calculateCompletionRate(statusCounts) {
    const total = statusCounts.reduce((sum, s) => sum + s.count, 0);
    const completed = statusCounts.find(s => s.status === 'completed')?.count || 0;
    return total > 0 ? ((completed / total) * 100).toFixed(2) : 0;
  }

  calculateErrorRate(levelCounts) {
    const total = levelCounts.reduce((sum, l) => sum + l.count, 0);
    const errors = levelCounts.find(l => l.level === 'error')?.count || 0;
    return total > 0 ? ((errors / total) * 100).toFixed(2) : 0;
  }

  calculateAgentSuccessRate(tasks) {
    const completed = tasks.filter(t => t.status === 'completed').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const total = completed + failed;
    return total > 0 ? ((completed / total) * 100).toFixed(2) : 0;
  }

  calculateAvgCompletionTime(tasks) {
    const completed = tasks.filter(t => t.status === 'completed' && t.started_at && t.completed_at);
    if (completed.length === 0) return 0;
    
    const totalTime = completed.reduce((sum, t) => {
      const start = new Date(t.started_at).getTime();
      const end = new Date(t.completed_at).getTime();
      return sum + (end - start);
    }, 0);
    
    return (totalTime / completed.length / 1000).toFixed(2); // seconds
  }

  generateRecommendations(stats) {
    const recommendations = [];
    
    if (stats.agents.count === 0) {
      recommendations.push('Create your first agent to start automating tasks');
    }
    
    if (stats.tasks.count === 0) {
      recommendations.push('Start creating tasks to utilize your agents');
    }
    
    const pendingTasks = stats.tasks_by_status.find(s => s.status === 'pending');
    if (pendingTasks && pendingTasks.count > 20) {
      recommendations.push('High number of pending tasks - consider adding more agents');
    }
    
    return recommendations;
  }

  // List all reports
  listReports(type = null, limit = 50) {
    return this.db.getReports(type, limit);
  }

  // Get report by ID
  getReport(reportId) {
    return this.db.getReport(reportId);
  }
}

module.exports = { ReportingSystem };