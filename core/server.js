const express = require('express');
const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'moris-core', version: '1.0.0' });
});

// API endpoints
app.get('/api', (req, res) => {
  res.json({ 
    message: 'MORIS API',
    endpoints: ['/health', '/api/agents', '/api/tasks']
  });
});

app.get('/api/agents', (req, res) => {
  res.json({
    count: 21,
    agents: [
      { id: 'moris', name: 'Moris', role: 'Orchestrator', status: 'active' },
      { id: 'dahlia', name: 'Dahlia', role: 'Assistant', status: 'active' }
    ]
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 MORIS Core running on port ${PORT}`);
});
