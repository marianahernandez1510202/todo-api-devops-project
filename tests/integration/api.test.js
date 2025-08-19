const request = require('supertest');
const app = require('../../src/app');

describe('Todo API Integration Tests', () => {
  let createdTodoId;

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('API Root', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('GET /api/v1/todos', () => {
    it('should return todos with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/todos')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/todos?page=1&limit=5')
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/todos?status=completed')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should filter by priority', async () => {
      const response = await request(app)
        .get('/api/v1/todos?priority=high')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('POST /api/v1/todos', () => {
    it('should create a new todo', async () => {
      const newTodo = {
        title: 'Test Todo',
        description: 'This is a test todo',
        priority: 'medium'
      };

      const response = await request(app)
        .post('/api/v1/todos')
        .send(newTodo)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(newTodo.title);
      expect(response.body.data.description).toBe(newTodo.description);
      expect(response.body.data.priority).toBe(newTodo.priority);
      expect(response.body.data.completed).toBe(false);

      // Store the ID for later tests
      createdTodoId = response.body.data.id;
    });

    it('should create todo with minimal data', async () => {
      const newTodo = {
        title: 'Minimal Todo'
      };

      const response = await request(app)
        .post('/api/v1/todos')
        .send(newTodo)
        .expect(201);

      expect(response.body.data.title).toBe(newTodo.title);
      expect(response.body.data.priority).toBe('medium'); // default
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/todos')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation error');
    });

    it('should validate title length', async () => {
      const response = await request(app)
        .post('/api/v1/todos')
        .send({ title: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate priority values', async () => {
      const response = await request(app)
        .post('/api/v1/todos')
        .send({
          title: 'Test Todo',
          priority: 'invalid'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should create high priority todo', async () => {
      const newTodo = {
        title: 'High Priority Todo',
        description: 'This is urgent',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/v1/todos')
        .send(newTodo)
        .expect(201);

      expect(response.body.data.priority).toBe('high');
    });
  });

  describe('GET /api/v1/todos/:id', () => {
    it('should return a specific todo', async () => {
      if (!createdTodoId) {
        // Create a todo first if none exists
        const createResponse = await request(app)
          .post('/api/v1/todos')
          .send({ title: 'Test Todo for Get' });
        createdTodoId = createResponse.body.data.id;
      }

      const response = await request(app)
        .get(`/api/v1/todos/${createdTodoId}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.id).toBe(createdTodoId);
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app)
        .get('/api/v1/todos/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Todo not found');
    });

    it('should handle invalid ID format', async () => {
      const response = await request(app)
        .get('/api/v1/todos/invalid-id')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/todos/:id', () => {
    it('should update a todo', async () => {
      if (!createdTodoId) {
        const createResponse = await request(app)
          .post('/api/v1/todos')
          .send({ title: 'Test Todo for Update' });
        createdTodoId = createResponse.body.data.id;
      }

      const updateData = {
        title: 'Updated Todo Title',
        description: 'Updated description',
        priority: 'high'
      };

      const response = await request(app)
        .put(`/api/v1/todos/${createdTodoId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.priority).toBe(updateData.priority);
    });

    it('should partially update a todo', async () => {
      const updateData = {
        title: 'Partially Updated Title'
      };

      const response = await request(app)
        .put(`/api/v1/todos/${createdTodoId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.title).toBe(updateData.title);
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app)
        .put('/api/v1/todos/99999')
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .put(`/api/v1/todos/${createdTodoId}`)
        .send({ priority: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/v1/todos/:id/complete', () => {
    it('should mark todo as completed', async () => {
      const response = await request(app)
        .patch(`/api/v1/todos/${createdTodoId}/complete`)
        .expect(200);

      expect(response.body.data.completed).toBe(true);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/v1/todos/:id/uncomplete', () => {
    it('should mark todo as not completed', async () => {
      const response = await request(app)
        .patch(`/api/v1/todos/${createdTodoId}/uncomplete`)
        .expect(200);

      expect(response.body.data.completed).toBe(false);
    });
  });

  describe('GET /api/v1/todos/stats', () => {
    it('should return todo statistics', async () => {
      const response = await request(app)
        .get('/api/v1/todos/stats')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('completed');
      expect(response.body.data).toHaveProperty('pending');
      expect(response.body.data).toHaveProperty('by_priority');
      expect(response.body.data.by_priority).toHaveProperty('high');
      expect(response.body.data.by_priority).toHaveProperty('medium');
      expect(response.body.data.by_priority).toHaveProperty('low');
    });
  });

  describe('GET /api/v1/todos/search', () => {
    it('should search todos', async () => {
      const response = await request(app)
        .get('/api/v1/todos/search?q=test')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('search');
      expect(response.body.search.query).toBe('test');
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/v1/todos/search')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle search pagination', async () => {
      const response = await request(app)
        .get('/api/v1/todos/search?q=todo&page=1&limit=5')
        .expect(200);

      expect(response.body.search.page).toBe(1);
      expect(response.body.search.limit).toBe(5);
    });
  });

  describe('DELETE /api/v1/todos/:id', () => {
    it('should delete a todo', async () => {
      const response = await request(app)
        .delete(`/api/v1/todos/${createdTodoId}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.data.id).toBe(createdTodoId);
    });

    it('should return 404 for already deleted todo', async () => {
      const response = await request(app)
        .delete(`/api/v1/todos/${createdTodoId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/v1/todos')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // This test assumes rate limiting is configured
      // In a real scenario, you might need to make many requests
      const response = await request(app)
        .get('/api/v1/todos')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
    });
  });
});