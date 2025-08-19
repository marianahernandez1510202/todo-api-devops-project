const { query } = require('../config/database');
const Joi = require('joi');

// Validation schemas
const createTodoSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional().allow(''),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  dueDate: Joi.date().optional().allow(null)
});

const updateTodoSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  completed: Joi.boolean().optional(),
  dueDate: Joi.date().optional().allow(null)
});

const searchSchema = Joi.object({
  q: Joi.string().min(1).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

class TodoController {
  // Get all todos
  static async getAllTodos(req, res) {
    try {
      const { page = 1, limit = 10, status, priority } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = '';
      let params = [];
      let paramCount = 0;

      if (status === 'completed') {
        paramCount++;
        whereClause += `WHERE completed = $${paramCount}`;
        params.push(true);
      } else if (status === 'pending') {
        paramCount++;
        whereClause += `WHERE completed = $${paramCount}`;
        params.push(false);
      }

      if (priority) {
        paramCount++;
        whereClause += whereClause ? ` AND priority = $${paramCount}` : `WHERE priority = $${paramCount}`;
        params.push(priority);
      }

      params.push(limit, offset);
      const limitOffset = `ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;

      const queryText = `
        SELECT 
          id, title, description, completed, priority, 
          due_date, created_at, updated_at
        FROM todos 
        ${whereClause}
        ${limitOffset}
      `;

      const result = await query(queryText, params);
      
      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM todos ${whereClause}`;
      const countParams = params.slice(0, paramCount);
      const countResult = await query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);
      
      res.json({
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching todos:', error);
      res.status(500).json({ 
        error: 'Failed to fetch todos',
        message: error.message 
      });
    }
  }

  // Get todo by ID
  static async getTodoById(req, res) {
    try {
      const { id } = req.params;
      const queryText = `
        SELECT 
          id, title, description, completed, priority, 
          due_date, created_at, updated_at
        FROM todos 
        WHERE id = $1
      `;

      const result = await query(queryText, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Todo not found',
          message: `Todo with ID ${id} does not exist`
        });
      }
      
      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching todo:', error);
      res.status(500).json({ 
        error: 'Failed to fetch todo',
        message: error.message 
      });
    }
  }

  // Create new todo
  static async createTodo(req, res) {
    try {
      const { error, value } = createTodoSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message
        });
      }
      
      const { title, description, priority = 'medium', dueDate } = value;
      
      const queryText = `
        INSERT INTO todos (title, description, priority, due_date)
        VALUES ($1, $2, $3, $4)
        RETURNING 
          id, title, description, completed, priority, 
          due_date, created_at, updated_at
      `;

      const result = await query(queryText, [title, description, priority, dueDate]);
      
      res.status(201).json({ 
        data: result.rows[0],
        message: 'Todo created successfully'
      });
    } catch (error) {
      console.error('Error creating todo:', error);
      res.status(500).json({ 
        error: 'Failed to create todo',
        message: error.message 
      });
    }
  }

  // Update todo
  static async updateTodo(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = updateTodoSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message
        });
      }
      
      // Build dynamic update query
      const updates = [];
      const params = [];
      let paramCount = 0;

      if (value.title !== undefined) {
        paramCount++;
        updates.push(`title = $${paramCount}`);
        params.push(value.title);
      }

      if (value.description !== undefined) {
        paramCount++;
        updates.push(`description = $${paramCount}`);
        params.push(value.description);
      }

      if (value.completed !== undefined) {
        paramCount++;
        updates.push(`completed = $${paramCount}`);
        params.push(value.completed);
      }

      if (value.priority !== undefined) {
        paramCount++;
        updates.push(`priority = $${paramCount}`);
        params.push(value.priority);
      }

      if (value.dueDate !== undefined) {
        paramCount++;
        updates.push(`due_date = $${paramCount}`);
        params.push(value.dueDate);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: 'No fields to update',
          message: 'At least one field must be provided for update'
        });
      }

      paramCount++;
      params.push(id);

      const queryText = `
        UPDATE todos 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, title, description, completed, priority, 
          due_date, created_at, updated_at
      `;

      const result = await query(queryText, params);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Todo not found',
          message: `Todo with ID ${id} does not exist`
        });
      }
      
      res.json({ 
        data: result.rows[0],
        message: 'Todo updated successfully'
      });
    } catch (error) {
      console.error('Error updating todo:', error);
      res.status(500).json({ 
        error: 'Failed to update todo',
        message: error.message 
      });
    }
  }

  // Delete todo
  static async deleteTodo(req, res) {
    try {
      const { id } = req.params;
      
      const queryText = 'DELETE FROM todos WHERE id = $1 RETURNING id';
      const result = await query(queryText, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Todo not found',
          message: `Todo with ID ${id} does not exist`
        });
      }
      
      res.json({ 
        message: 'Todo deleted successfully',
        data: { id: parseInt(id) }
      });
    } catch (error) {
      console.error('Error deleting todo:', error);
      res.status(500).json({ 
        error: 'Failed to delete todo',
        message: error.message 
      });
    }
  }

  // Get statistics
  static async getStats(req, res) {
    try {
      const queryText = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE completed = true) as completed,
          COUNT(*) FILTER (WHERE completed = false) as pending,
          COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
          COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority,
          COUNT(*) FILTER (WHERE priority = 'low') as low_priority,
          COUNT(*) FILTER (WHERE due_date < NOW() AND completed = false) as overdue
        FROM todos
      `;

      const result = await query(queryText);
      const stats = result.rows[0];
      
      res.json({
        data: {
          total: parseInt(stats.total),
          completed: parseInt(stats.completed),
          pending: parseInt(stats.pending),
          by_priority: {
            high: parseInt(stats.high_priority),
            medium: parseInt(stats.medium_priority),
            low: parseInt(stats.low_priority)
          },
          overdue: parseInt(stats.overdue)
        }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch statistics',
        message: error.message 
      });
    }
  }

  // Search todos
  static async searchTodos(req, res) {
    try {
      const { error, value } = searchSchema.validate(req.query);
      
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message
        });
      }
      
      const { q, page, limit } = value;
      const offset = (page - 1) * limit;
      
      const queryText = `
        SELECT 
          id, title, description, completed, priority, 
          due_date, created_at, updated_at
        FROM todos 
        WHERE 
          title ILIKE $1 OR description ILIKE $1
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;

      const result = await query(queryText, [`%${q}%`, limit, offset]);
      
      res.json({
        data: result.rows,
        search: {
          query: q,
          page,
          limit,
          results: result.rows.length
        }
      });
    } catch (error) {
      console.error('Error searching todos:', error);
      res.status(500).json({ 
        error: 'Failed to search todos',
        message: error.message 
      });
    }
  }

  // Complete todo
  static async completeTodo(req, res) {
    try {
      const { id } = req.params;
      
      const queryText = `
        UPDATE todos 
        SET completed = true
        WHERE id = $1
        RETURNING 
          id, title, description, completed, priority, 
          due_date, created_at, updated_at
      `;

      const result = await query(queryText, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Todo not found',
          message: `Todo with ID ${id} does not exist`
        });
      }
      
      res.json({ 
        data: result.rows[0],
        message: 'Todo marked as completed'
      });
    } catch (error) {
      console.error('Error completing todo:', error);
      res.status(500).json({ 
        error: 'Failed to complete todo',
        message: error.message 
      });
    }
  }

  // Uncomplete todo
  static async uncompleteTodo(req, res) {
    try {
      const { id } = req.params;
      
      const queryText = `
        UPDATE todos 
        SET completed = false
        WHERE id = $1
        RETURNING 
          id, title, description, completed, priority, 
          due_date, created_at, updated_at
      `;

      const result = await query(queryText, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Todo not found',
          message: `Todo with ID ${id} does not exist`
        });
      }
      
      res.json({ 
        data: result.rows[0],
        message: 'Todo marked as not completed'
      });
    } catch (error) {
      console.error('Error uncompleting todo:', error);
      res.status(500).json({ 
        error: 'Failed to uncomplete todo',
        message: error.message 
      });
    }
  }
}

module.exports = TodoController;