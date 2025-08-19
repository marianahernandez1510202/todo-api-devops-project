const express = require('express');
const router = express.Router();

// Mock data para empezar (sin base de datos)
let todos = [
  {
    id: 1,
    title: "Setup Cloud Run",
    description: "Deploy todo API to Google Cloud Run",
    completed: true,
    priority: "high",
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    title: "Add database connection",
    description: "Connect to Cloud SQL PostgreSQL",
    completed: false,
    priority: "medium",
    created_at: new Date().toISOString()
  }
];

let nextId = 3;

// GET /api/v1/todos - Obtener todos los todos
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: todos,
    total: todos.length
  });
});

// GET /api/v1/todos/:id - Obtener un todo específico
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const todo = todos.find(t => t.id === id);
  
  if (!todo) {
    return res.status(404).json({
      success: false,
      message: 'Todo not found'
    });
  }
  
  res.json({
    success: true,
    data: todo
  });
});

// POST /api/v1/todos - Crear nuevo todo
router.post('/', (req, res) => {
  const { title, description, priority = 'medium' } = req.body;
  
  if (!title) {
    return res.status(400).json({
      success: false,
      message: 'Title is required'
    });
  }
  
  const newTodo = {
    id: nextId++,
    title,
    description,
    completed: false,
    priority,
    created_at: new Date().toISOString()
  };
  
  todos.push(newTodo);
  
  res.status(201).json({
    success: true,
    message: 'Todo created successfully',
    data: newTodo
  });
});

// PUT /api/v1/todos/:id - Actualizar todo
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const todoIndex = todos.findIndex(t => t.id === id);
  
  if (todoIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Todo not found'
    });
  }
  
  const { title, description, completed, priority } = req.body;
  
  // Actualizar campos
  if (title !== undefined) todos[todoIndex].title = title;
  if (description !== undefined) todos[todoIndex].description = description;
  if (completed !== undefined) todos[todoIndex].completed = completed;
  if (priority !== undefined) todos[todoIndex].priority = priority;
  
  todos[todoIndex].updated_at = new Date().toISOString();
  
  res.json({
    success: true,
    message: 'Todo updated successfully',
    data: todos[todoIndex]
  });
});

// DELETE /api/v1/todos/:id - Eliminar todo
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const todoIndex = todos.findIndex(t => t.id === id);
  
  if (todoIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Todo not found'
    });
  }
  
  const deletedTodo = todos.splice(todoIndex, 1)[0];
  
  res.json({
    success: true,
    message: 'Todo deleted successfully',
    data: deletedTodo
  });
});

// GET /api/v1/todos/stats - Estadísticas
router.get('/stats/summary', (req, res) => {
  const completed = todos.filter(t => t.completed).length;
  const pending = todos.filter(t => !t.completed).length;
  const byPriority = {
    high: todos.filter(t => t.priority === 'high').length,
    medium: todos.filter(t => t.priority === 'medium').length,
    low: todos.filter(t => t.priority === 'low').length
  };
  
  res.json({
    success: true,
    data: {
      total: todos.length,
      completed,
      pending,
      byPriority
    }
  });
});

module.exports = router;