const Joi = require('joi');

// Mock data for now (replace with database later)
let todos = [
  {
    id: 1,
    title: 'Welcome to Todo API',
    description: 'This is your first todo item. You can edit or delete it.',
    completed: false,
    priority: 'medium',
    due_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Set up development environment',
    description: 'Install Node.js, Docker, and other required tools.',
    completed: false,
    priority: 'high',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let nextId = 3;

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
      
      let filteredTodos = [...todos];
      
      // Apply filters
      if (status === 'completed') {
        filteredTodos = filteredTodos.filter(todo => todo.completed);
      } else if (status === 'pending') {
        filteredTodos = filteredTodos.filter(todo => !todo.completed);
      }
      
      if (priority) {
        filteredTodos = filteredTodos.filter(todo => todo.priority === priority);
      }
      
      // Apply pagination
      const paginatedTodos = filteredTodos.slice(offset, offset + parseInt(limit));
      
      res.json({
        data: paginatedTodos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredTodos.length,
          pages: Math.ceil(filteredTodos.length / limit)
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
      const todo = todos.find(t => t.id === parseInt(id));
      
      if (!todo) {
        return res.status(404).json({ 
          error: 'Todo not found',
          message: `Todo with ID ${id} does not exist`
        });
      }
      
      res.json({ data: todo });
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
      
      const newTodo = {
        id: nextId++,
        title: value.title,
        description: value.description || '',
        completed: false,
        priority: value.priority || 'medium',
        due_date: value.dueDate || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      todos.push(newTodo);
      
      res.status(201).json({ 
        data: newTodo,
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
      
      const todoIndex = todos.findIndex(t => t.id === parseInt(id));
      if (todoIndex === -1) {
        return res.status(404).json({ 
          error: 'Todo not found',
          message: `Todo with ID ${id} does not exist`
        });
      }
      
      // Update todo
      const updatedTodo = {
        ...todos[todoIndex],
        ...value,
        dueDate: value.dueDate !== undefined ? value.dueDate : todos[todoIndex].due_date,
        updated_at: new Date().toISOString()
      };
      
      todos[todoIndex] = updatedTodo;
      
      res.json({ 
        data: updatedTodo,
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
      
      const todoIndex = todos.findIndex(t => t.id === parseInt(id));
      if (todoIndex === -1) {
        return res.status(404).json({ 
          error: 'Todo not found',
          message: `Todo with ID ${id} does not exist`
        });
      }
      
      todos.splice(todoIndex, 1);
      
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
      const total = todos.length;
      const completed = todos.filter(t => t.completed).length;
      const pending = total - completed;
      const byPriority = {
        high: todos.filter(t => t.priority === 'high').length,
        medium: todos.filter(t => t.priority === 'medium').length,
        low: todos.filter(t => t.priority === 'low').length
      };
      const overdue = todos.filter(t => 
        t.due_date && new Date(t.due_date) < new Date() && !t.completed
      ).length;

      const stats = {
        total,
        completed,
        pending,
        by_priority: byPriority,
        overdue
      };
      
      res.json({ data: stats });
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
      
      const searchResults = todos.filter(todo =>
        todo.title.toLowerCase().includes(q.toLowerCase()) ||
        (todo.description && todo.description.toLowerCase().includes(q.toLowerCase()))
      );
      
      res.json({
        data: searchResults,
        search: {
          query: q,
          page,
          limit,
          results: searchResults.length
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
      
      const todoIndex = todos.findIndex(t => t.id === parseInt(id));
      if (todoIndex === -1) {
        return res.status(404).json({ 
          error: 'Todo not found',
          message: `Todo with ID ${id} does not exist`
        });
      }
      
      todos[todoIndex].completed = true;
      todos[todoIndex].updated_at = new Date().toISOString();
      
      res.json({ 
        data: todos[todoIndex],
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
      
      const todoIndex = todos.findIndex(t => t.id === parseInt(id));
      if (todoIndex === -1) {
        return res.status(404).json({ 
          error: 'Todo not found',
          message: `Todo with ID ${id} does not exist`
        });
      }
      
      todos[todoIndex].completed = false;
      todos[todoIndex].updated_at = new Date().toISOString();
      
      res.json({ 
        data: todos[todoIndex],
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