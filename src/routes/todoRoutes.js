const express = require('express');
const TodoController = require('../controllers/todoController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public routes (no authentication required for demo)
// In production, you might want to protect these routes

/**
 * @route GET /api/v1/todos
 * @desc Get all todos with pagination and filters
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 10)
 * @query status - Filter by status (completed/pending)
 * @query priority - Filter by priority (low/medium/high)
 */
router.get('/', TodoController.getAllTodos);

/**
 * @route GET /api/v1/todos/stats
 * @desc Get todos statistics
 */
router.get('/stats', TodoController.getStats);

/**
 * @route GET /api/v1/todos/search
 * @desc Search todos by title or description
 * @query q - Search term
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 10)
 */
router.get('/search', TodoController.searchTodos);

/**
 * @route GET /api/v1/todos/:id
 * @desc Get specific todo by ID
 * @param id - Todo ID
 */
router.get('/:id', TodoController.getTodoById);

/**
 * @route POST /api/v1/todos
 * @desc Create new todo
 * @body title - Todo title (required)
 * @body description - Todo description (optional)
 * @body priority - Todo priority: low/medium/high (default: medium)
 * @body dueDate - Due date (optional)
 */
router.post('/', TodoController.createTodo);

/**
 * @route PUT /api/v1/todos/:id
 * @desc Update todo
 * @param id - Todo ID
 * @body title - Todo title (optional)
 * @body description - Todo description (optional)
 * @body completed - Completion status (optional)
 * @body priority - Todo priority (optional)
 * @body dueDate - Due date (optional)
 */
router.put('/:id', TodoController.updateTodo);

/**
 * @route PATCH /api/v1/todos/:id/complete
 * @desc Mark todo as completed
 * @param id - Todo ID
 */
router.patch('/:id/complete', TodoController.completeTodo);

/**
 * @route PATCH /api/v1/todos/:id/uncomplete
 * @desc Mark todo as not completed
 * @param id - Todo ID
 */
router.patch('/:id/uncomplete', TodoController.uncompleteTodo);

/**
 * @route DELETE /api/v1/todos/:id
 * @desc Delete todo
 * @param id - Todo ID
 */
router.delete('/:id', TodoController.deleteTodo);

// Protected routes (example with authentication middleware)
// Uncomment these if you want to add authentication

// router.use(auth); // Apply authentication to all routes below

// router.post('/bulk', TodoController.createBulkTodos);
// router.delete('/bulk', TodoController.deleteBulkTodos);

module.exports = router;