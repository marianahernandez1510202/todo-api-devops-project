const express = require('express');
const TodoController = require('../controllers/todoController');

const router = express.Router();

/**
 * @route GET /api/v1/todos
 * @desc Get all todos with pagination and filters
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
 */
router.get('/search', TodoController.searchTodos);

/**
 * @route GET /api/v1/todos/:id
 * @desc Get specific todo by ID
 */
router.get('/:id', TodoController.getTodoById);

/**
 * @route POST /api/v1/todos
 * @desc Create new todo
 */
router.post('/', TodoController.createTodo);

/**
 * @route PUT /api/v1/todos/:id
 * @desc Update todo
 */
router.put('/:id', TodoController.updateTodo);

/**
 * @route PATCH /api/v1/todos/:id/complete
 * @desc Mark todo as completed
 */
router.patch('/:id/complete', TodoController.completeTodo);

/**
 * @route PATCH /api/v1/todos/:id/uncomplete
 * @desc Mark todo as not completed
 */
router.patch('/:id/uncomplete', TodoController.uncompleteTodo);

/**
 * @route DELETE /api/v1/todos/:id
 * @desc Delete todo
 */
router.delete('/:id', TodoController.deleteTodo);

module.exports = router;