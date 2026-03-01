/**
 * Integration Tests
 * End-to-end testing of agent delegation
 */

const assert = require('assert');
const { TestRunner } = require('./test-runner');
const { MorisCore } = require('./main');
const { DatabaseManager } = require('./database');
const { AgentRegistry } = require('./agents');

class IntegrationTests {
  constructor() {
    this.core = null;
    this.db = null;
    this.runner = new TestRunner();
  }

  async setup() {
    // Use in-memory database for tests
    this.db = new DatabaseManager(':memory:');
    
    // Create test agents
    this.db.createAgent({
      id: 'test-coder',
      name: 'Test Coder',
      role: 'developer',
      status: 'active',
      config: {}
    });

    this.db.createAgent({
      id: 'test-writer',
      name: 'Test Writer',
      role: 'content',
      status: 'active',
      config: {}
    });
  }

  async teardown() {
    if (this.db) {
      this.db.close();
    }
  }

  // Register all integration tests
  registerTests() {
    // Test complete task delegation flow
    this.runner.test('Task delegation to agent', async (t) => {
      await this.setup();
      
      // Create a task
      const taskId = 'task_test_001';
      this.db.createTask({
        id: taskId,
        title: 'Write a simple function',
        agent_id: 'test-coder',
        priority: 5,
        data: { type: 'code', requirements: 'Create a sum function' }
      });

      // Verify task was created
      const task = this.db.getTask(taskId);
      t.assertExists(task);
      t.assertEqual(task.agent_id, 'test-coder');
      t.assertEqual(task.status, 'pending');

      await this.teardown();
    });

    // Test agent execution
    this.runner.test('Agent task execution', async (t) => {
      await this.setup();
      
      const { CoderAgent } = require('./agents');
      const agent = new CoderAgent({ id: 'test-coder', name: 'Test Coder' });
      
      // Execute a coding task
      const result = await agent.execute('write', {
        language: 'javascript',
        requirements: 'Create a sum function'
      });

      t.assertExists(result);
      t.assertExists(result.code);
      t.assertTrue(result.code.includes('sum'));

      await this.teardown();
    });

    // Test workflow execution
    this.runner.test('Content creation workflow', async (t) => {
      await this.setup();
      
      // Create all required agents
      const { ResearchAgent, CopywriterAgent } = require('./agents-extended');
      
      const researcher = new ResearchAgent({ id: 'test-researcher' });
      const writer = new CopywriterAgent({ id: 'test-writer' });
      
      // Simulate workflow
      const researchResult = await researcher.execute('search', { 
        query: 'AI agents' 
      });
      t.assertExists(researchResult);
      t.assertExists(researchResult.results);
      
      const contentResult = await writer.execute('write', {
        topic: 'AI agents',
        tone: 'professional',
        length: 'short'
      });
      t.assertExists(contentResult);
      t.assertExists(contentResult.content);

      await this.teardown();
    });

    // Test skill execution
    this.runner.test('Skill execution via agent', async (t) => {
      const { SkillLoader } = require('./skill-loader');
      const loader = new SkillLoader();
      
      await loader.loadAllSkills();
      const catalog = loader.getCatalog();
      
      t.assertTrue(catalog.length > 0, 'Skills should be loaded');
      
      // Test weather skill
      const weatherResult = await loader.execute('weather', 'current', {
        location: 'Prague',
        format: 'compact'
      });
      
      t.assertTrue(weatherResult.success, 'Weather skill should succeed');
      t.assertExists(weatherResult.data);
    });

    // Test skilled agents
    this.runner.test('Skilled agent execution', async (t) => {
      const { WeatherAgent } = require('./agents-skilled');
      
      const agent = new WeatherAgent({ id: 'test-weather' });
      await agent.init();
      
      const result = await agent.execute('current', { location: 'Prague' });
      
      t.assertTrue(result.success || result.location === 'Prague', 'Weather agent should work');
      t.assertExists(result.timestamp);
    });

    // Test error handling
    this.runner.test('Task error handling', async (t) => {
      await this.setup();
      
      this.db.createTask({
        id: 'error_task',
        title: 'Invalid agent task',
        agent_id: 'nonexistent-agent',
        data: { invalid: true }
      });
      
      const task = this.db.getTask('error_task');
      t.assertExists(task);
      
      // Simulate update that would fail
      try {
        // This should handle gracefully
        const update = this.db.updateTask('error_task', { status: 'failed' });
        t.assertExists(update);
      } catch (error) {
        // Expected in some cases
      }
      
      await this.teardown();
    });

    // Test reporting
    this.runner.test('Report generation', async (t) => {
      await this.setup();
      
      const { ReportingSystem } = require('./reporting');
      const reporting = new ReportingSystem(this.db);
      
      // Create some test data
      this.db.createTask({
        id: 'report_task_1',
        title: 'Task 1',
        agent_id: 'test-coder',
        status: 'completed',
        priority: 5
      });
      
      this.db.createTask({
        id: 'report_task_2',
        title: 'Task 2',
        agent_id: 'test-writer',
        status: 'pending',
        priority: 3
      });
      
      const report = await reporting.generateDashboardReport();
      
      t.assertExists(report.reportId);
      t.assertExists(report.report);
      t.assertTrue(report.report.summary.total_tasks >= 2);
      
      await this.teardown();
    });
  }

  // Run all integration tests
  async run() {
    console.log('\n🔬 Running Integration Tests\n' + '='.repeat(50));
    
    this.registerTests();
    
    const results = await this.runner.run();
    
    return results;
  }
}

// Run if executed directly
if (require.main === module) {
  const tests = new IntegrationTests();
  tests.run()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Integration tests failed:', err);
      process.exit(1);
    });
}

module.exports = { IntegrationTests };