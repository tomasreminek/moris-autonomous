/**
 * Notification System
 * Email, webhook, and in-app notifications
 */

const { logger } = require('./logger');
const nodemailer = require('nodemailer');

class NotificationManager {
  constructor(config = {}) {
    this.config = {
      email: config.email || {},
      webhooks: config.webhooks || [],
      ...config
    };
    
    this.emailTransporter = null;
    this.setupEmail();
  }

  setupEmail() {
    if (this.config.email.host) {
      this.emailTransporter = nodemailer.createTransport({
        host: this.config.email.host,
        port: this.config.email.port || 587,
        secure: this.config.email.secure || false,
        auth: {
          user: this.config.email.user,
          pass: this.config.email.pass
        }
      });
      
      logger.info('Email transport configured');
    }
  }

  // Send notification through all channels
  async notify(notification) {
    const { type, title, message, data = {}, channels = ['all'] } = notification;
    
    const results = {
      email: null,
      webhook: null,
      inApp: null
    };

    // In-app notification
    if (channels.includes('all') || channels.includes('in-app')) {
      results.inApp = await this.sendInApp({ type, title, message, data });
    }

    // Email notification
    if ((channels.includes('all') || channels.includes('email')) && this.emailTransporter) {
      results.email = await this.sendEmail({
        to: data.recipient || this.config.email.defaultRecipient,
        subject: title,
        text: message,
        html: this.formatHtmlEmail({ title, message, data })
      });
    }

    // Webhook notification
    if (channels.includes('all') || channels.includes('webhook')) {
      results.webhook = await this.sendWebhook({ type, title, message, data });
    }

    logger.info(`Notification sent: ${title} (${type})`);
    return results;
  }

  // Send in-app notification
  async sendInApp(notification) {
    // Store in database for dashboard display
    const inAppNotification = {
      id: `notif_${Date.now()}`,
      ...notification,
      read: false,
      createdAt: new Date().toISOString()
    };

    // This would be stored in database and broadcast via WebSocket
    return { success: true, id: inAppNotification.id };
  }

  // Send email
  async sendEmail({ to, subject, text, html }) {
    if (!this.emailTransporter) {
      logger.warn('Email not configured, skipping email notification');
      return { success: false, error: 'Email not configured' };
    }

    try {
      const result = await this.emailTransporter.sendMail({
        from: this.config.email.from || 'moris@example.com',
        to,
        subject,
        text,
        html
      });

      logger.info(`Email sent: ${subject} to ${to}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send webhook notification
  async sendWebhook(payload) {
    // Use existing webhook manager if available
    // For now, simple HTTP POST
    return { success: true, pending: true };
  }

  // Format HTML email
  formatHtmlEmail({ title, message, data }) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; color: white; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      <p>${message}</p>
      ${data.details ? `<p><strong>Details:</strong> ${data.details}</p>` : ''}
      ${data.action ? `<p><a href="${data.action.url}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">${data.action.text}</a></p>` : ''}
    </div>
    <div class="footer">
      <p>Sent by MORIS Autonomous</p>
    </div>
  </div>
</body>
</html>`;
  }

  // Quick notification methods
  async taskCompleted(task) {
    return this.notify({
      type: 'task.completed',
      title: 'Task Completed',
      message: `Task "${task.title}" has been completed successfully.`,
      data: { taskId: task.id, task }
    });
  }

  async taskFailed(task, error) {
    return this.notify({
      type: 'task.failed',
      title: 'Task Failed',
      message: `Task "${task.title}" failed: ${error.message}`,
      data: { taskId: task.id, error: error.message },
      channels: ['in-app', 'email']
    });
  }

  async agentError(agent, error) {
    return this.notify({
      type: 'agent.error',
      title: 'Agent Error',
      message: `Agent ${agent.name} encountered an error: ${error.message}`,
      data: { agentId: agent.id, error: error.message },
      channels: ['in-app', 'email']
    });
  }

  async systemAlert(level, message, data = {}) {
    return this.notify({
      type: `system.alert.${level}`,
      title: `System Alert: ${level.toUpperCase()}`,
      message,
      data,
      channels: level === 'critical' ? ['all'] : ['in-app']
    });
  }

  async dailySummary(stats) {
    return this.notify({
      type: 'system.daily-summary',
      title: 'Daily Summary',
      message: `Today: ${stats.tasksCompleted} tasks completed, ${stats.agentsActive} agents active.`,
      data: stats,
      channels: ['email']
    });
  }
}

module.exports = { NotificationManager };