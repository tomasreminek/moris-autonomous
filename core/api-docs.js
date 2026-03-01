/**
 * OpenAPI Specification
 * API documentation for MORIS
 */

const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'MORIS Autonomous API',
    version: '2.1.0',
    description: 'AI Agent Ecosystem API - Build, deploy, and orchestrate autonomous AI agents',
    contact: {
      name: 'MORIS Support',
      url: 'https://github.com/tomasreminek/moris-autonomous'
    }
  },
  servers: [
    {
      url: 'http://localhost/api',
      description: 'Local development server'
    }
  ],
  tags: [
    { name: 'System', description: 'System health and status' },
    { name: 'Agents', description: 'Agent management' },
    { name: 'Tasks', description: 'Task management' },
    { name: 'Reports', description: 'Reporting and analytics' },
    { name: 'Logs', description: 'Activity logging' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Check system health status',
        responses: {
          '200': {
            description: 'System is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    status: { type: 'string', example: 'healthy' },
                    service: { type: 'string', example: 'moris-core' },
                    version: { type: 'string', example: '2.1.0' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/stats': {
      get: {
        tags: ['System'],
        summary: 'System statistics',
        description: 'Get comprehensive system statistics',
        responses: {
          '200': {
            description: 'System statistics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        database: { type: 'object' },
                        agents: { type: 'object' },
                        queues: { type: 'object' },
                        system: { type: 'object' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/agents': {
      get: {
        tags: ['Agents'],
        summary: 'List agents',
        description: 'Get all registered agents',
        responses: {
          '200': {
            description: 'List of agents',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    count: { type: 'integer' },
                    agents: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          role: { type: 'string' },
                          status: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/agents/{id}': {
      get: {
        tags: ['Agents'],
        summary: 'Get agent details',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Agent ID'
          }
        ],
        responses: {
          '200': {
            description: 'Agent details'
          },
          '404': {
            description: 'Agent not found'
          }
        }
      }
    },
    '/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks',
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] }
          },
          {
            name: 'agent_id',
            in: 'query',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'List of tasks'
          }
        }
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create task',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  agent_id: { type: 'string' },
                  priority: { type: 'integer', minimum: 1, maximum: 10 },
                  data: { type: 'object' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Task created'
          },
          '400': {
            description: 'Invalid request'
          }
        }
      }
    },
    '/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'Get task details',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Task details'
          },
          '404': {
            description: 'Task not found'
          }
        }
      }
    },
    '/reports': {
      get: {
        tags: ['Reports'],
        summary: 'List reports',
        parameters: [
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string' }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 }
          }
        ],
        responses: {
          '200': {
            description: 'List of reports'
          }
        }
      },
      post: {
        tags: ['Reports'],
        summary: 'Generate report',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['dashboard', 'health', 'agent'] }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Report generated'
          }
        }
      }
    },
    '/logs': {
      get: {
        tags: ['Logs'],
        summary: 'Get activity logs',
        parameters: [
          {
            name: 'agent_id',
            in: 'query',
            schema: { type: 'string' }
          },
          {
            name: 'level',
            in: 'query',
            schema: { type: 'string', enum: ['info', 'warn', 'error'] }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 100 }
          }
        ],
        responses: {
          '200': {
            description: 'Activity logs'
          }
        }
      }
    }
  }
};

module.exports = { swaggerDocument };