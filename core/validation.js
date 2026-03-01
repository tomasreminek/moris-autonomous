/**
 * Validation Middleware
 * Input validation for API endpoints
 */

const { AppError, ValidationError } = require('./error-handler');
const { logger } = require('./logger');

class Validator {
  // Validate task creation
  static validateCreateTask(req, res, next) {
    const { title, priority } = req.body;
    const errors = [];

    if (!title || typeof title !== 'string') {
      errors.push('Title is required and must be a string');
    } else if (title.length < 3 || title.length > 200) {
      errors.push('Title must be between 3 and 200 characters');
    }

    if (priority !== undefined) {
      const p = parseInt(priority);
      if (isNaN(p) || p < 1 || p > 10) {
        errors.push('Priority must be a number between 1 and 10');
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError(errors.join('; ')));
    }

    next();
  }

  // Validate agent creation
  static validateCreateAgent(req, res, next) {
    const { id, name, role } = req.body;
    const errors = [];

    if (!id || typeof id !== 'string') {
      errors.push('ID is required and must be a string');
    } else if (!/^[a-z0-9_-]+$/.test(id)) {
      errors.push('ID must contain only lowercase letters, numbers, hyphens, and underscores');
    }

    if (!name || typeof name !== 'string') {
      errors.push('Name is required and must be a string');
    } else if (name.length < 2 || name.length > 100) {
      errors.push('Name must be between 2 and 100 characters');
    }

    if (!role || typeof role !== 'string') {
      errors.push('Role is required and must be a string');
    }

    if (errors.length > 0) {
      return next(new ValidationError(errors.join('; ')));
    }

    next();
  }

  // Validate report generation
  static validateGenerateReport(req, res, next) {
    const { type } = req.body;
    const validTypes = ['dashboard', 'health', 'agent', 'performance'];

    if (type && !validTypes.includes(type)) {
      return next(new ValidationError(`Type must be one of: ${validTypes.join(', ')}`));
    }

    next();
  }

  // Sanitize string input
  static sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str
      .trim()
      .replace(/[<>]/g, '') // Remove < and >
      .substring(0, 10000); // Limit length
  }

  // Middleware to sanitize request body
  static sanitizeBody(req, res, next) {
    if (req.body && typeof req.body === 'object') {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = Validator.sanitizeString(req.body[key]);
        }
      });
    }
    next();
  }

  // Validate UUID
  static validateUUID(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  // Validate ID parameter
  static validateIdParam(req, res, next) {
    const { id } = req.params;
    
    if (!id || typeof id !== 'string') {
      return next(new ValidationError('ID parameter is required'));
    }

    if (id.length > 100) {
      return next(new ValidationError('ID parameter is too long'));
    }

    // Check for path traversal attempts
    if (id.includes('..') || id.includes('/') || id.includes('\\')) {
      return next(new ValidationError('Invalid ID format'));
    }

    next();
  }
}

module.exports = { Validator };