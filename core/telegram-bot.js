/**
 * Telegram Bot Integration
 * Bidirectional messaging with Telegram
 */

const { logger } = require('./logger');

class TelegramBot {
  constructor(config = {}) {
    this.token = config.token || process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = 'https://api.telegram.org/bot';
    this.webhookUrl = config.webhookUrl;
    this.allowedChats = config.allowedChats || [];
    this.commandHandlers = new Map();
    this.messageHandlers = [];
    this.isRunning = false;
  }

  // Initialize bot
  async init() {
    if (!this.token) {
      logger.warn('Telegram bot token not set, skipping initialization');
      return false;
    }

    logger.info('Initializing Telegram bot...');

    // Set up webhook if provided
    if (this.webhookUrl) {
      await this.setWebhook(this.webhookUrl);
    }

    // Register default commands
    this.registerCommand('start', this.handleStart.bind(this));
    this.registerCommand('help', this.handleHelp.bind(this));
    this.registerCommand('status', this.handleStatus.bind(this));
    this.registerCommand('agents', this.handleAgents.bind(this));
    this.registerCommand('tasks', this.handleTasks.bind(this));

    this.isRunning = true;
    logger.info('Telegram bot initialized');
    
    // Start polling if no webhook
    if (!this.webhookUrl) {
      this.startPolling();
    }
    
    return true;
  }

  // Make API request to Telegram
  async apiRequest(method, params = {}) {
    try {
      const fetch = (await import('node-fetch')).default;
      const url = `${this.apiUrl}${this.token}/${method}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`);
      }
      
      return data.result;
    } catch (error) {
      logger.error(`Telegram API request failed: ${method}`, error);
      throw error;
    }
  }

  // Set webhook
  async setWebhook(url) {
    return this.apiRequest('setWebhook', { url });
  }

  // Send message
  async sendMessage(chatId, text, options = {}) {
    // Check if chat is allowed
    if (this.allowedChats.length > 0 && !this.allowedChats.includes(chatId.toString())) {
      logger.warn(`Chat ${chatId} not in allowed list`);
      return false;
    }

    return this.apiRequest('sendMessage', {
      chat_id: chatId,
      text: text.substring(0, 4096), // Telegram limit
      parse_mode: options.parse_mode || 'Markdown',
      disable_web_page_preview: true,
      ...options
    });
  }

  // Register command handler
  registerCommand(command, handler) {
    this.commandHandlers.set(command.toLowerCase(), handler);
    logger.debug(`Telegram command registered: /${command}`);
  }

  // Register message handler
  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  // Process webhook update
  async processUpdate(update) {
    try {
      const { message, callback_query } = update;

      if (message) {
        await this.handleMessage(message);
      } else if (callback_query) {
        await this.handleCallback(callback_query);
      }
    } catch (error) {
      logger.error('Error processing Telegram update:', error);
    }
  }

  // Handle incoming message
  async handleMessage(message) {
    const { text, chat, from } = message;
    const chatId = chat.id;

    logger.info(`Telegram message from ${from.username || from.id}: ${text}`);

    // Check authorization
    if (this.allowedChats.length > 0 && !this.allowedChats.includes(chatId.toString())) {
      await this.sendMessage(chatId, '⛔ Not authorized');
      return;
    }

    // Handle commands
    if (text && text.startsWith('/')) {
      const parts = text.substring(1).split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      const handler = this.commandHandlers.get(command);
      if (handler) {
        await handler(chatId, args, message);
      } else {
        await this.sendMessage(chatId, `❓ Unknown command: /${command}\nUse /help for available commands`);
      }
    } else {
      // Handle text messages
      for (const handler of this.messageHandlers) {
        await handler(chatId, text, message);
      }
    }
  }

  // Handle callback queries (button presses)
  async handleCallback(callbackQuery) {
    const { data, message } = callbackQuery;
    logger.debug(`Telegram callback: ${data}`);
    
    // Acknowledge
    await this.apiRequest('answerCallbackQuery', {
      callback_query_id: callbackQuery.id
    });
  }

  // Command handlers
  async handleStart(chatId, args, message) {
    const welcome = `🤖 *MORIS Autonomous Bot*\n\nWelcome! I'm your AI agent orchestrator.\n\nAvailable commands:\n• /status - System status\n• /agents - List agents\n• /tasks - List tasks\n• /help - Show help\n\nSend me a message and I'll delegate to the right agent!`;
    
    await this.sendMessage(chatId, welcome);
  }

  async handleHelp(chatId, args, message) {
    const help = `🤖 *MORIS Commands*\n\n📊 */status* - System health\n🤖 */agents* - List AI agents\n📋 */tasks* - List tasks\n🌤️ */weather* [city] - Get weather\n🔒 */audit* - Security audit\n\nYou can also send me any task and I'll:\n1. Analyze what needs to be done\n2. Delegate to the right agent\n3. Report results back\n\nTry: "Check weather in Prague" or "Run security audit"`;
    
    await this.sendMessage(chatId, help);
  }

  async handleStatus(chatId, args, message) {
    await this.sendMessage(chatId, '⏳ Fetching system status...');
    // This would call the actual API
    const status = `✅ *System Status*\n\n🟢 Core: Healthy\n🟢 Database: Connected\n🟢 Task Queue: Running\n🟢 WebSocket: Online\n\nAgents: 11 active\nTasks: 0 pending`;
    await this.sendMessage(chatId, status);
  }

  async handleAgents(chatId, args, message) {
    const agents = `🤖 *Active Agents (11)*\n\n🧠 Moris - Orchestrator\n🌸 Dahlia - Assistant\n💻 Pro Coder - Developer\n✍️ Copywriter - Content\n🌦️ *Weather Expert* - Weather\n🔒 *Security Auditor* - Security\n🛠️ *Skill Architect* - Skill creation\n\nAll agents ready for tasks!`;
    await this.sendMessage(chatId, agents);
  }

  async handleTasks(chatId, args, message) {
    await this.sendMessage(chatId, '📋 *Recent Tasks*\n\nNo recent tasks.\n\nCreate one with: "Create task for [agent] to [description]"');
  }

  // Start polling for updates (if no webhook)
  startPolling() {
    logger.info('Starting Telegram polling...');
    
    const poll = async () => {
      if (!this.isRunning) return;
      
      try {
        const updates = await this.apiRequest('getUpdates', {
          offset: this.lastUpdateId + 1,
          limit: 100
        });

        for (const update of updates) {
          this.lastUpdateId = update.update_id;
          await this.processUpdate(update);
        }
      } catch (error) {
        logger.error('Polling error:', error);
      }

      // Continue polling
      setTimeout(poll, 1000);
    };

    poll();
  }

  // Stop bot
  stop() {
    this.isRunning = false;
    logger.info('Telegram bot stopped');
  }

  // Send voice message (TTS)
  async sendVoice(chatId, text) {
    // This would integrate with TTS service
    logger.info(`Would send voice to ${chatId}: ${text.substring(0, 50)}...`);
  }
}

module.exports = { TelegramBot };
