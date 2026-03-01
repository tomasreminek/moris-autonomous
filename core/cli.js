#!/usr/bin/env node

/**
 * MORIS CLI
 * Command line interface for MORIS management
 */

const { program } = require('commander');
const { MorisClient } = require('./client');
const chalk = require('chalk');

const client = new MorisClient({
  baseUrl: process.env.MORIS_URL || 'http://localhost'
});

program
  .name('moris')
  .description('MORIS Autonomous CLI')
  .version('2.1.0');

// Health command
program
  .command('health')
  .description('Check system health')
  .action(async () => {
    try {
      const health = await client.health();
      console.log(chalk.green('✓'), 'System is', health.status);
      console.log('  Version:', health.version);
      console.log('  Uptime:', Math.floor(health.uptime), 'seconds');
    } catch (error) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show system statistics')
  .action(async () => {
    try {
      const result = await client.stats();
      const stats = result.data;
      
      console.log(chalk.bold('\n📊 System Statistics\n'));
      
      console.log(chalk.bold('Database:'));
      console.log('  Agents:', stats.database.agents.count);
      console.log('  Tasks:', stats.database.tasks.count);
      
      console.log(chalk.bold('\nAgents:'));
      console.log('  Total:', stats.agents.total);
      console.log('  By Status:', JSON.stringify(stats.agents.by_status));
      
      console.log(chalk.bold('\nQueues:'));
      Object.entries(stats.queues).forEach(([name, q]) => {
        console.log(`  ${name}: ${q.waiting} waiting, ${q.active} active`);
      });
    } catch (error) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

// List agents
program
  .command('agents')
  .description('List all agents')
  .action(async () => {
    try {
      const result = await client.listAgents();
      
      console.log(chalk.bold('\n🤖 Agents\n'));
      console.log(`${'ID'.padEnd(15)} ${'Name'.padEnd(20)} ${'Role'.padEnd(15)} ${'Status'}`);
      console.log('-'.repeat(70));
      
      result.agents.forEach(agent => {
        const statusColor = agent.status === 'active' ? chalk.green : chalk.yellow;
        console.log(
          `${agent.id.padEnd(15)} ` +
          `${agent.name.padEnd(20)} ` +
          `${agent.role.padEnd(15)} ` +
          statusColor(agent.status)
        );
      });
    } catch (error) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

// List tasks
program
  .command('tasks')
  .description('List tasks')
  .option('-s, --status <status>', 'Filter by status')
  .action(async (options) => {
    try {
      const filters = {};
      if (options.status) filters.status = options.status;
      
      const result = await client.listTasks(filters);
      
      console.log(chalk.bold(`\n📋 Tasks (${result.count})\n`));
      
      result.tasks.forEach(task => {
        const statusColor = {
          pending: chalk.gray,
          running: chalk.yellow,
          completed: chalk.green,
          failed: chalk.red
        }[task.status] || chalk.white;
        
        console.log(`[${statusColor(task.status.toUpperCase())}] ${task.title}`);
        console.log(`  ID: ${task.id} | Agent: ${task.agent_id || 'unassigned'} | Priority: ${task.priority}`);
      });
    } catch (error) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

// Create task
program
  .command('create-task')
  .description('Create a new task')
  .requiredOption('-t, --title <title>', 'Task title')
  .option('-a, --agent <agent>', 'Assign to agent')
  .option('-d, --description <description>', 'Task description')
  .option('-p, --priority <priority>', 'Priority (1-10)', '5')
  .action(async (options) => {
    try {
      const task = await client.createTask({
        title: options.title,
        description: options.description,
        agent_id: options.agent,
        priority: parseInt(options.priority)
      });
      
      console.log(chalk.green('✓'), 'Task created:', task.task.id);
    } catch (error) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

// Create backup
program
  .command('backup')
  .description('Create system backup')
  .option('-t, --type <type>', 'Backup type (full, database, logs)', 'full')
  .action(async (options) => {
    try {
      console.log(chalk.blue('Creating backup...'));
      const backup = await client.createBackup(options.type);
      console.log(chalk.green('✓'), 'Backup created:', backup.id);
    } catch (error) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

// Generate report
program
  .command('report')
  .description('Generate report')
  .option('-t, --type <type>', 'Report type (dashboard, health)', 'dashboard')
  .action(async (options) => {
    try {
      console.log(chalk.blue('Generating report...'));
      const report = await client.generateReport(options.type);
      console.log(chalk.green('✓'), 'Report generated:', report.report.reportId);
      console.log('  Type:', report.report.report.type);
    } catch (error) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

program.parse();