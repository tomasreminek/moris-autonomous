/**
 * Enhanced Core Server
 * With logging, error handling, security
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { logger } = require('./logger');
const { errorHandler, notFoundHandler, asyncHandler, AppError } = require('./error-handler');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for simplicity
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMITED'
    }
  }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'moris-core',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'MORIS Autonomous API',
    version: '1.0.0',
    endpoints: [
      { path: '/health', method: 'GET', description: 'Health check' },
      { path: '/api/agents', method: 'GET', description: 'List agents' },
      { path: '/api/tasks', method: 'GET', description: 'List tasks' },
      { path: '/api/tasks', method: 'POST', description: 'Create task' }
    ]
  });
});

// Agents endpoint with error handling
app.get('/api/agents', asyncHandler(async (req, res) => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 10));
  
  res.json({
    success: true,
    count: 21,
    agents: [
      { id: 'moris', name: 'Moris', role: 'Orchestrator', status: 'active', icon: '🧠' },
      { id: 'dahlia', name: 'Dahlia', role: 'Assistant', status: 'active', icon: '🌸' },
      { id: 'coder', name: 'Pro Coder', role: 'Developer', status: 'active', icon: '💻' },
      { id: 'copywriter', name: 'Copywriter', role: 'Content', status: 'active', icon: '✍️' },
      { id: 'strategy', name: 'StrategyAgent', role: 'Strategy', status: 'active', icon: '🎯' }
    ]
  });
}));

// Tasks endpoint
app.get('/api/tasks', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    count: 0,
    tasks: []
  });
}));

// Create task endpoint with validation
app.post('/api/tasks', asyncHandler(async (req, res) => {
  const { title, agent } = req.body;
  
  if (!title) {
    throw new AppError('Title is required', 400, 'VALIDATION_ERROR');
  }
  
  logger.info(`Task created: ${title}`);
  
  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    task: {
      id: `task_${Date.now()}`,
      title,
      agent: agent || 'auto',
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  });
}));

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`🚀 MORIS Core server running on port ${PORT}`);
  console.log(`✅ Server ready: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 API docs: http://localhost:${PORT}/api`);
});

module.exports = { app };