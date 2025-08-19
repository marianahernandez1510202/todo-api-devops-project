const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// GET /api/v1/todos - Obtener todos los todos
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, title, description, completed, priority, due_date, created_at, updated_at 
      FROM todos 
      ORDER BY created_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching todos',
      error: error.message
    });
  }
});

// GET /api/v1/todos/:id - Obtener un todo específico
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID'
      });
    }
    
    const result = await query('SELECT * FROM todos WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching todo:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching todo',
      error: error.message
    });
  }
});

// POST /api/v1/todos - Crear nuevo todo
router.post('/', async (req, res) => {
  try {
    const { title, description, priority = 'medium', due_date } = req.body;
    
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }
    
    // Validar priority
    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be low, medium, or high'
      });
    }
    
    const result = await query(`
      INSERT INTO todos (title, description, priority, due_date) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `, [title.trim(), description?.trim() || null, priority, due_date || null]);
    
    res.status(201).json({
      success: true,
      message: 'Todo created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating todo',
      error: error.message
    });
  }
});

// PUT /api/v1/todos/:id - Actualizar todo
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID'
      });
    }
    
    const { title, description, completed, priority, due_date } = req.body;
    
    // Verificar que el todo existe
    const existingTodo = await query('SELECT * FROM todos WHERE id = $1', [id]);
    if (existingTodo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }
    
    // Validar priority si se proporciona
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be low, medium, or high'
      });
    }
    
    // Construir query dinámicamente
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      updateValues.push(title.trim());
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(description?.trim() || null);
    }
    if (completed !== undefined) {
      updateFields.push(`completed = $${paramIndex++}`);
      updateValues.push(Boolean(completed));
    }
    if (priority !== undefined) {
      updateFields.push(`priority = $${paramIndex++}`);
      updateValues.push(priority);
    }
    if (due_date !== undefined) {
      updateFields.push(`due_date = $${paramIndex++}`);
      updateValues.push(due_date || null);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    // Agregar updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);
    
    const updateQuery = `
      UPDATE todos 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;
    
    const result = await query(updateQuery, updateValues);
    
    res.json({
      success: true,
      message: 'Todo updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating todo',
      error: error.message
    });
  }
});

// DELETE /api/v1/todos/:id - Eliminar todo
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID'
      });
    }
    
    const result = await query('DELETE FROM todos WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Todo deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting todo',
      error: error.message
    });
  }
});

// GET /api/v1/todos/stats/summary - Estadísticas
router.get('/stats/summary', async (req, res) => {
  try {
    const totalResult = await query('SELECT COUNT(*) as total FROM todos');
    const completedResult = await query('SELECT COUNT(*) as completed FROM todos WHERE completed = true');
    const pendingResult = await query('SELECT COUNT(*) as pending FROM todos WHERE completed = false');
    
    const priorityResult = await query(`
      SELECT 
        priority,
        COUNT(*) as count
      FROM todos 
      GROUP BY priority
    `);
    
    const byPriority = {
      high: 0,
      medium: 0,
      low: 0
    };
    
    priorityResult.rows.forEach(row => {
      byPriority[row.priority] = parseInt(row.count);
    });
    
    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].total),
        completed: parseInt(completedResult.rows[0].completed),
        pending: parseInt(pendingResult.rows[0].pending),
        byPriority
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

module.exports = router;