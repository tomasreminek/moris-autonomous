/**
 * Project Management System
 * Tasks, projects, assignments to agents, tracking
 */

const crypto = require('crypto');
const { logger } = require('./logger');

class ProjectManager {
  constructor(db) {
    this.db = db;
    this.agents = new Map();
  }

  // Register agent
  registerAgent(agentConfig) {
    this.agents.set(agentConfig.id, {
      ...agentConfig,
      assignedTasks: [],
      completedTasks: 0,
      activeTasks: 0
    });
    logger.info(`Agent registered: ${agentConfig.id}`);
  }

  // Create project
  async createProject(userId, projectData) {
    const { name, description, deadline, priority = 5 } = projectData;
    
    const projectId = `proj_${crypto.randomBytes(6).toString('hex')}`;
    const project = {
      id: projectId,
      name,
      description,
      userId,
      priority,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      status: 'planning', // planning, active, on_hold, completed, cancelled
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasks: [],
      totalTasks: 0,
      completedTasks: 0,
      progress: 0,
      assignedAgents: []
    };

    this.db.createProject(project);
    logger.info(`Project created: ${projectId}`);
    
    return {
      success: true,
      project: this.db.getProject(projectId)
    };
  }

  // Create task
  async createTask(userId, taskData) {
    const {
      title,
      description,
      projectId,
      agentId,
      priority = 5,
      deadline,
      tags = [],
      dependencies = []
    } = taskData;

    if (!title) {
      throw new Error('Task title is required');
    }

    const taskId = `task_${crypto.randomBytes(6).toString('hex')}`;
    const task = {
      id: taskId,
      title,
      description,
      projectId: projectId || null,
      userId,
      agentId: agentId || null, // assigned agent
      priority, // 1-10, 10 = highest
      status: 'pending', // pending, in_progress, review, completed, blocked, cancelled
      deadline: deadline ? new Date(deadline).toISOString() : null,
      tags,
      dependencies,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      notes: [],
      estimatedHours: null,
      actualHours: null,
      cost: null
    };

    this.db.createTask(task);

    // Update project task count if part of project
    if (projectId) {
      this.db.incrementProjectTaskCount(projectId);
    }

    // Notify agent if assigned
    if (agentId) {
      this.assignTaskToAgent(taskId, agentId);
    }

    logger.info(`Task created: ${taskId}`);
    return {
      success: true,
      task: this.db.getTask(taskId)
    };
  }

  // Assign task to agent
  async assignTaskToAgent(taskId, agentId) {
    const task = this.db.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Update task
    this.db.updateTask(taskId, {
      agentId,
      status: task.status === 'pending' ? 'in_progress' : task.status,
      startedAt: new Date().toISOString()
    });

    // Update agent stats
    this.agents.set(agentId, {
      ...agent,
      assignedTasks: [...agent.assignedTasks, taskId],
      activeTasks: agent.activeTasks + 1
    });

    // Log assignment
    this.db.addTaskNote(taskId, 'SYSTEM', `Task assigned to agent ${agentId}`);
    
    logger.info(`Task ${taskId} assigned to agent ${agentId}`);
    return { success: true };
  }

  // Get agent workload
  getAgentWorkload(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return null;
    }

    const tasks = this.db.getAgentTasks(agentId);
    
    return {
      agentId,
      name: agent.name,
      totalTasks: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      byPriority: {
        high: tasks.filter(t => t.priority >= 8).length,
        medium: tasks.filter(t => t.priority >= 5 && t.priority < 8).length,
        low: tasks.filter(t => t.priority < 5).length
      },
      overdue: tasks.filter(t => t.deadline && new Date(t.deadline) < new Date()).length
    };
  }

  // Update task status
  async updateTaskStatus(taskId, newStatus, userId, notes = '') {
    const task = this.db.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const oldStatus = task.status;
    const updates = {
      status: newStatus,
      updatedAt: new Date().toISOString()
    };

    if (newStatus === 'in_progress' && oldStatus === 'pending') {
      updates.startedAt = new Date().toISOString();
    }

    if (newStatus === 'completed') {
      updates.completedAt = new Date().toISOString();
      
      // Update agent stats
      const agent = this.agents.get(task.agentId);
      if (agent) {
        this.agents.set(task.agentId, {
          ...agent,
          assignedTasks: agent.assignedTasks.filter(id => id !== taskId),
          activeTasks: Math.max(0, agent.activeTasks - 1),
          completedTasks: agent.completedTasks + 1
        });
      }

      // Update project progress
      if (task.projectId) {
        this.updateProjectProgress(task.projectId);
      }
    }

    this.db.updateTask(taskId, updates);

    if (notes) {
      this.db.addTaskNote(taskId, userId, notes);
    }

    logger.info(`Task ${taskId} status: ${oldStatus} → ${newStatus}`);
    
    return {
      success: true,
      task: this.db.getTask(taskId)
    };
  }

  // Update project progress
  updateProjectProgress(projectId) {
    const project = this.db.getProject(projectId);
    if (!project) return;

    const tasks = this.db.getProjectTasks(projectId);
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    this.db.updateProject(projectId, {
      totalTasks: total,
      completedTasks: completed,
      progress,
      status: progress === 100 ? 'completed' : progress > 0 ? 'active' : 'planning'
    });
  }

  // Get project dashboard
  getProjectDashboard(projectId) {
    const project = this.db.getProject(projectId);
    if (!project) {
      return null;
    }

    const tasks = this.db.getProjectTasks(projectId);
    const agentTasks = {};

    for (const task of tasks) {
      if (task.agentId) {
        if (!agentTasks[task.agentId]) {
          agentTasks[task.agentId] = [];
        }
        agentTasks[task.agentId].push(task);
      }
    }

    return {
      project,
      summary: {
        totalTasks: tasks.length,
        byStatus: {
          pending: tasks.filter(t => t.status === 'pending').length,
          inProgress: tasks.filter(t => t.status === 'in_progress').length,
          review: tasks.filter(t => t.status === 'review').length,
          completed: tasks.filter(t => t.status === 'completed').length,
          blocked: tasks.filter(t => t.status === 'blocked').length
        },
        byPriority: {
          critical: tasks.filter(t => t.priority >= 9).length,
          high: tasks.filter(t => t.priority >= 7 && t.priority < 9).length,
          medium: tasks.filter(t => t.priority >= 4 && t.priority < 7).length,
          low: tasks.filter(t => t.priority < 4).length
        },
        overdue: tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed').length,
        dueThisWeek: tasks.filter(t => {
          if (!t.deadline) return false;
          const deadline = new Date(t.deadline);
          const weekFromNow = new Date();
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          return deadline <= weekFromNow && t.status !== 'completed';
        }).length
      },
      agentWorkload: agentTasks,
      recentActivity: tasks
        .flatMap(t => t.notes || [])
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10)
    };
  }

  // Get user projects overview
  getUserProjectsOverview(userId) {
    const projects = this.db.getUserProjects(userId);
    const tasks = this.db.getUserTasks(userId);

    return {
      summary: {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        completedProjects: projects.filter(p => p.status === 'completed').length,
        totalTasks: tasks.length,
        myTasks: tasks.filter(t => t.userId === userId).length,
        assignedTasks: tasks.filter(t => t.agentId).length
      },
      projects: projects.map(p => ({
        ...p,
        taskSummary: {
          total: this.db.getProjectTasks(p.id).length,
          completed: this.db.getProjectTasks(p.id).filter(t => t.status === 'completed').length
        }
      })),
      upcomingDeadlines: tasks
        .filter(t => t.deadline && new Date(t.deadline) >= new Date() && t.status !== 'completed')
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5)
    };
  }

  // Auto-assign tasks to agents based on workload and skills
  autoAssignTasks() {
    const unassignedTasks = this.db.getUnassignedTasks();
    const agents = Array.from(this.agents.values());

    const assignments = [];

    for (const task of unassignedTasks) {
      // Find best agent
      const bestAgent = this.selectBestAgent(task, agents);
      
      if (bestAgent) {
        this.assignTaskToAgent(task.id, bestAgent.id);
        assignments.push({
          taskId: task.id,
          taskTitle: task.title,
          agentId: bestAgent.id,
          agentName: bestAgent.name,
          reason: 'Best match: lowest load + skill match'
        });
      }
    }

    return {
      success: true,
      assigned: assignments.length,
      assignments
    };
  }

  // Select best agent for task
  selectBestAgent(task, agents) {
    // Simple scoring: prefer agents with fewer active tasks
    const scoredAgents = agents
      .filter(a => a.activeTasks < 10) // Don't overload
      .map(agent => ({
        ...agent,
        score: 100 - (agent.activeTasks * 10) // Lower load = higher score
      }))
      .sort((a, b) => b.score - a.score);

    return scoredAgents[0] || null;
  }

  // Get full system dashboard
  getSystemDashboard() {
    const allTasks = this.db.getAllTasks();
    const allProjects = this.db.getAllProjects();

    return {
      summary: {
        totalProjects: allProjects.length,
        totalTasks: allTasks.length,
        completionRate: allTasks.length > 0 
          ? Math.round((allTasks.filter(t => t.status === 'completed').length / allTasks.length) * 100)
          : 0,
        activeAgents: Array.from(this.agents.values()).filter(a => a.activeTasks > 0).length,
        totalAgents: this.agents.size
      },
      agents: Array.from(this.agents.values()).map(a => this.getAgentWorkload(a.id)),
      recentProjects: allProjects.slice(-5),
      overdueTasks: allTasks.filter(t => 
        t.deadline && 
        new Date(t.deadline) < new Date() && 
        t.status !== 'completed'
      )
    };
  }
}

module.exports = { ProjectManager };
