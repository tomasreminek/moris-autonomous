/**
 * Testing Framework
 * Comprehensive test suite for MORIS
 */

const assert = require('assert');
const { logger } = require('./logger');

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      failures: []
    };
  }

  // Register a test
  test(name, fn) {
    this.tests.push({ name, fn, type: 'test' });
  }

  // Register a test suite
  describe(name, fn) {
    this.tests.push({ name, fn, type: 'suite' });
  }

  // Skip a test
  skip(name, fn) {
    this.tests.push({ name, fn, type: 'skip' });
  }

  // Assertion helpers
  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertTrue(value, message) {
    if (value !== true) {
      throw new Error(message || `Expected true, got ${value}`);
    }
  }

  assertFalse(value, message) {
    if (value !== false) {
      throw new Error(message || `Expected false, got ${value}`);
    }
  }

  assertExists(value, message) {
    if (value === null || value === undefined) {
      throw new Error(message || `Expected value to exist`);
    }
  }

  assertContains(haystack, needle, message) {
    if (!haystack.includes(needle)) {
      throw new Error(message || `Expected ${haystack} to contain ${needle}`);
    }
  }

  // Run all tests
  async run() {
    console.log('\n🧪 Running MORIS Test Suite\n' + '='.repeat(50));
    
    const startTime = Date.now();
    
    for (const test of this.tests) {
      if (test.type === 'skip') {
        console.log(`⏭️  SKIP: ${test.name}`);
        this.results.skipped++;
        this.results.total++;
        continue;
      }

      try {
        await test.fn(this);
        console.log(`✅ PASS: ${test.name}`);
        this.results.passed++;
      } catch (error) {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   ${error.message}`);
        this.results.failed++;
        this.results.failures.push({
          test: test.name,
          error: error.message,
          stack: error.stack
        });
      }
      this.results.total++;
    }

    const duration = Date.now() - startTime;
    
    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results');
    console.log('='.repeat(50));
    console.log(`Total:  ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Skipped: ${this.results.skipped} ⏭️`);
    console.log(`Duration: ${duration}ms`);
    console.log('='.repeat(50));

    if (this.results.failed > 0) {
      console.log('\n❌ Failures:');
      this.results.failures.forEach((f, i) => {
        console.log(`\n${i + 1}. ${f.test}`);
        console.log(`   ${f.error}`);
      });
    }

    return this.results;
  }
}

// Test Suites
function databaseTests(runner) {
  runner.describe('Database Tests', async (t) => {
    const { DatabaseManager } = require('./database');
    const db = new DatabaseManager(':memory:');

    t.test('should create agent', () => {
      db.createAgent({
        id: 'test-agent',
        name: 'Test Agent',
        role: 'tester',
        status: 'active',
        config: {}
      });
      
      const agent = db.getAgent('test-agent');
      t.assertExists(agent);
      t.assertEqual(agent.name, 'Test Agent');
    });

    t.test('should create and retrieve task', () => {
      db.createTask({
        id: 'test-task',
        title: 'Test Task',
        agent_id: 'test-agent',
        priority: 5
      });
      
      const task = db.getTask('test-task');
      t.assertExists(task);
      t.assertEqual(task.title, 'Test Task');
    });

    t.test('should get all agents', () => {
      const agents = db.getAllAgents();
      t.assertTrue(agents.length >= 1);
    });

    t.test('should get tasks with filters', () => {
      const tasks = db.getTasks({ status: 'pending' });
      t.assertTrue(Array.isArray(tasks));
    });

    t.test('should log activity', () => {
      db.logActivity({
        agent_id: 'test-agent',
        task_id: 'test-task',
        level: 'info',
        message: 'Test activity'
      });
      
      const logs = db.getActivityLogs({}, 10);
      t.assertTrue(logs.length > 0);
    });

    db.close();
  });
}

function agentTests(runner) {
  runner.describe('Agent Tests', async (t) => {
    const { BaseAgent, CoderAgent, CopywriterAgent } = require('./agents');

    t.test('should create base agent', () => {
      const agent = new BaseAgent({
        name: 'Test Agent',
        role: 'tester'
      });
      
      t.assertExists(agent);
      t.assertEqual(agent.name, 'Test Agent');
      t.assertEqual(agent.status, 'idle');
    });

    t.test('should register and execute skill', async () => {
      const agent = new BaseAgent({ name: 'Skill Agent' });
      
      agent.registerSkill('test', async (data) => {
        return { result: data.input * 2 };
      });
      
      const result = await agent.executeSkill('test', { input: 5 });
      t.assertEqual(result.result, 10);
    });

    t.test('should store and recall memory', () => {
      const agent = new BaseAgent({ name: 'Memory Agent' });
      
      agent.remember('key', 'value');
      const value = agent.recall('key');
      
      t.assertEqual(value, 'value');
    });

    t.test('should create coder agent with skills', () => {
      const agent = new CoderAgent({ name: 'Test Coder' });
      
      t.assertTrue(agent.hasSkill('write_code'));
      t.assertTrue(agent.hasSkill('review_code'));
      t.assertTrue(agent.hasSkill('debug'));
    });

    t.test('should create copywriter agent with skills', () => {
      const agent = new CopywriterAgent({ name: 'Test Writer' });
      
      t.assertTrue(agent.hasSkill('write_copy'));
      t.assertTrue(agent.hasSkill('edit_text'));
    });
  });
}

function queueTests(runner) {
  runner.describe('Task Queue Tests', async (t) => {
    const { TaskQueue, JobTypes } = require('./task-queue');

    // Skip if Redis not available
    try {
      const queue = new TaskQueue();
      
      t.test('should create queue', () => {
        const q = queue.getQueue('test-queue');
        t.assertExists(q);
      });

      t.test('should have job types defined', () => {
        t.assertExists(JobTypes.AGENT_TASK);
        t.assertExists(JobTypes.REPORT_GENERATION);
      });

      await queue.close();
    } catch (error) {
      t.skip('Redis not available, skipping queue tests', () => {});
    }
  });
}

function reportingTests(runner) {
  runner.describe('Reporting Tests', async (t) => {
    const { DatabaseManager } = require('./database');
    const { ReportingSystem } = require('./reporting');
    
    const db = new DatabaseManager(':memory:');
    const reporting = new ReportingSystem(db);

    t.test('should generate dashboard report', async () => {
      const report = await reporting.generateDashboardReport();
      t.assertExists(report.reportId);
      t.assertExists(report.report);
    });

    t.test('should generate health report', async () => {
      const report = await reporting.generateHealthReport();
      t.assertExists(report.reportId);
      t.assertExists(report.report.status);
    });

    t.test('should list reports', () => {
      const reports = reporting.listReports();
      t.assertTrue(Array.isArray(reports));
    });

    db.close();
  });
}

function websocketTests(runner) {
  runner.describe('WebSocket Tests', async (t) => {
    const { WebSocketServer } = require('./websocket');

    t.test('should create WebSocket server', () => {
      const wss = new WebSocketServer(0); // Random port
      t.assertExists(wss);
    });

    t.test('should generate client ID', () => {
      const wss = new WebSocketServer(0);
      const id1 = wss.generateClientId();
      const id2 = wss.generateClientId();
      
      t.assertExists(id1);
      t.assertExists(id2);
      t.assertTrue(id1 !== id2);
    });
  });
}

// Main test runner
async function runAllTests() {
  const runner = new TestRunner();
  
  // Add test suites
  databaseTests(runner);
  agentTests(runner);
  queueTests(runner);
  reportingTests(runner);
  websocketTests(runner);
  
  // Run tests
  const results = await runner.run();
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  runAllTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}

module.exports = { TestRunner, runAllTests };