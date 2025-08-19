const TodoModel = require('../../src/models/todoModel');
const { query } = require('../../src/config/database');

// Mock the database query function
jest.mock('../../src/config/database', () => ({
  query: jest.fn()
}));

describe('TodoModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all todos with default pagination', async () => {
      const mockTodos = [
        { id: 1, title: 'Test Todo', completed: false, priority: 'medium' },
        { id: 2, title: 'Another Todo', completed: true, priority: 'high' }
      ];

      query.mockResolvedValue({ rows: mockTodos });

      const result = await TodoModel.getAll();

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [10, 0]
      );
      expect(result).toEqual(mockTodos);
    });

    it('should apply status filter correctly', async () => {
      const mockTodos = [
        { id: 1, title: 'Completed Todo', completed: true, priority: 'medium' }
      ];

      query.mockResolvedValue({ rows: mockTodos });

      await TodoModel.getAll({ status: 'completed' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE completed = $1'),
        [true, 10, 0]
      );
    });

    it('should apply priority filter correctly', async () => {
      const mockTodos = [
        { id: 1, title: 'High Priority Todo', completed: false, priority: 'high' }
      ];

      query.mockResolvedValue({ rows: mockTodos });

      await TodoModel.getAll({ priority: 'high' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE priority = $1'),
        ['high', 10, 0]
      );
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database connection failed'));

      await expect(TodoModel.getAll()).rejects.toThrow('Failed to fetch todos');
    });
  });

  describe('getById', () => {
    it('should return todo by id', async () => {
      const mockTodo = { id: 1, title: 'Test Todo', completed: false };
      query.mockResolvedValue({ rows: [mockTodo] });

      const result = await TodoModel.getById(1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [1]
      );
      expect(result).toEqual(mockTodo);
    });

    it('should return null if todo not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await TodoModel.getById(999);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database error'));

      await expect(TodoModel.getById(1)).rejects.toThrow('Failed to fetch todo');
    });
  });

  describe('create', () => {
    it('should create a new todo', async () => {
      const todoData = {
        title: 'New Todo',
        description: 'Test description',
        priority: 'high'
      };

      const mockCreatedTodo = {
        id: 1,
        ...todoData,
        completed: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      query.mockResolvedValue({ rows: [mockCreatedTodo] });

      const result = await TodoModel.create(todoData);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO todos'),
        [todoData.title, todoData.description, todoData.priority, undefined]
      );
      expect(result).toEqual(mockCreatedTodo);
    });

    it('should create todo with default priority', async () => {
      const todoData = {
        title: 'New Todo',
        description: 'Test description'
      };

      const mockCreatedTodo = {
        id: 1,
        ...todoData,
        priority: 'medium',
        completed: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      query.mockResolvedValue({ rows: [mockCreatedTodo] });

      await TodoModel.create(todoData);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO todos'),
        [todoData.title, todoData.description, 'medium', undefined]
      );
    });

    it('should handle database errors', async () => {
      const todoData = { title: 'Test Todo' };
      query.mockRejectedValue(new Error('Database error'));

      await expect(TodoModel.create(todoData)).rejects.toThrow('Failed to create todo');
    });
  });

  describe('update', () => {
    it('should update todo fields', async () => {
      const updateData = {
        title: 'Updated Title',
        completed: true
      };

      const mockUpdatedTodo = {
        id: 1,
        ...updateData,
        description: 'Original description',
        priority: 'medium',
        created_at: new Date(),
        updated_at: new Date()
      };

      query.mockResolvedValue({ rows: [mockUpdatedTodo] });

      const result = await TodoModel.update(1, updateData);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE todos SET'),
        [updateData.title, updateData.completed, 1]
      );
      expect(result).toEqual(mockUpdatedTodo);
    });

    it('should return null if todo not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await TodoModel.update(999, { title: 'Updated' });

      expect(result).toBeNull();
    });

    it('should throw error if no fields to update', async () => {
      await expect(TodoModel.update(1, {})).rejects.toThrow('No fields to update');
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database error'));

      await expect(TodoModel.update(1, { title: 'Updated' })).rejects.toThrow('Failed to update todo');
    });
  });

  describe('delete', () => {
    it('should delete todo successfully', async () => {
      query.mockResolvedValue({ rowCount: 1 });

      const result = await TodoModel.delete(1);

      expect(query).toHaveBeenCalledWith(
        'DELETE FROM todos WHERE id = $1 RETURNING id',
        [1]
      );
      expect(result).toBe(true);
    });

    it('should return false if todo not found', async () => {
      query.mockResolvedValue({ rowCount: 0 });

      const result = await TodoModel.delete(999);

      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database error'));

      await expect(TodoModel.delete(1)).rejects.toThrow('Failed to delete todo');
    });
  });

  describe('count', () => {
    it('should return total count', async () => {
      query.mockResolvedValue({ rows: [{ count: '5' }] });

      const result = await TodoModel.count();

      expect(query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM todos ',
        []
      );
      expect(result).toBe(5);
    });

    it('should count with filters', async () => {
      query.mockResolvedValue({ rows: [{ count: '3' }] });

      await TodoModel.count({ status: 'completed' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE completed = $1'),
        [true]
      );
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      const mockStats = {
        total: '10',
        completed: '6',
        pending: '4',
        high_priority: '2',
        medium_priority: '5',
        low_priority: '3',
        overdue: '1'
      };

      query.mockResolvedValue({ rows: [mockStats] });

      const result = await TodoModel.getStats();

      expect(result).toEqual({
        total: 10,
        completed: 6,
        pending: 4,
        by_priority: {
          high: 2,
          medium: 5,
          low: 3
        },
        overdue: 1
      });
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database error'));

      await expect(TodoModel.getStats()).rejects.toThrow('Failed to fetch statistics');
    });
  });

  describe('search', () => {
    it('should search todos by term', async () => {
      const mockTodos = [
        { id: 1, title: 'Search Term Todo', description: 'Test' }
      ];

      query.mockResolvedValue({ rows: mockTodos });

      const result = await TodoModel.search('Search Term');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        ['%Search Term%', 10, 0]
      );
      expect(result).toEqual(mockTodos);
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database error'));

      await expect(TodoModel.search('test')).rejects.toThrow('Failed to search todos');
    });
  });
});