const { query } = require('../config/database');

class TodoModel {
  // Get all todos with pagination and filters
  static async getAll(options = {}) {
    const { limit = 10, offset = 0, status, priority } = options;
    
    let whereClause = '';
    let params = [];
    let paramCount = 0;

    if (status !== undefined) {
      paramCount++;
      whereClause += `WHERE completed = $${paramCount}`;
      params.push(status === 'completed');
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

    try {
      const result = await query(queryText, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching todos:', error);
      throw new Error('Failed to fetch todos');
    }
  }

  // Get todo by ID
  static async getById(id) {
    const queryText = `
      SELECT 
        id, title, description, completed, priority, 
        due_date, created_at, updated_at
      FROM todos 
      WHERE id = $1
    `;

    try {
      const result = await query(queryText, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching todo by ID:', error);
      throw new Error('Failed to fetch todo');
    }
  }

  // Create new todo
  static async create(todoData) {
    const { title, description, priority = 'medium', dueDate } = todoData;
    
    const queryText = `
      INSERT INTO todos (title, description, priority, due_date)
      VALUES ($1, $2, $3, $4)
      RETURNING 
        id, title, description, completed, priority, 
        due_date, created_at, updated_at
    `;

    try {
      const result = await query(queryText, [title, description, priority, dueDate]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating todo:', error);
      throw new Error('Failed to create todo');
    }
  }

  // Update todo
  static async update(id, todoData) {
    const { title, description, completed, priority, dueDate } = todoData;
    
    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (title !== undefined) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      params.push(title);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }

    if (completed !== undefined) {
      paramCount++;
      updates.push(`completed = $${paramCount}`);
      params.push(completed);
    }

    if (priority !== undefined) {
      paramCount++;
      updates.push(`priority = $${paramCount}`);
      params.push(priority);
    }

    if (dueDate !== undefined) {
      paramCount++;
      updates.push(`due_date = $${paramCount}`);
      params.push(dueDate);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
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

    try {
      const result = await query(queryText, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating todo:', error);
      throw new Error('Failed to update todo');
    }
  }

  // Delete todo
  static async delete(id) {
    const queryText = 'DELETE FROM todos WHERE id = $1 RETURNING id';

    try {
      const result = await query(queryText, [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw new Error('Failed to delete todo');
    }
  }

  // Get count with filters
  static async count(options = {}) {
    const { status, priority } = options;
    
    let whereClause = '';
    let params = [];
    let paramCount = 0;

    if (status !== undefined) {
      paramCount++;
      whereClause += `WHERE completed = $${paramCount}`;
      params.push(status === 'completed');
    }

    if (priority) {
      paramCount++;
      whereClause += whereClause ? ` AND priority = $${paramCount}` : `WHERE priority = $${paramCount}`;
      params.push(priority);
    }

    const queryText = `SELECT COUNT(*) as count FROM todos ${whereClause}`;

    try {
      const result = await query(queryText, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error counting todos:', error);
      throw new Error('Failed to count todos');
    }
  }

  // Get statistics
  static async getStats() {
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

    try {
      const result = await query(queryText);
      const stats = result.rows[0];
      
      return {
        total: parseInt(stats.total),
        completed: parseInt(stats.completed),
        pending: parseInt(stats.pending),
        by_priority: {
          high: parseInt(stats.high_priority),
          medium: parseInt(stats.medium_priority),
          low: parseInt(stats.low_priority)
        },
        overdue: parseInt(stats.overdue)
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw new Error('Failed to fetch statistics');
    }
  }

  // Search todos
  static async search(searchTerm, options = {}) {
    const { limit = 10, offset = 0 } = options;
    
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

    try {
      const result = await query(queryText, [`%${searchTerm}%`, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error searching todos:', error);
      throw new Error('Failed to search todos');
    }
  }
}

module.exports = TodoModel;