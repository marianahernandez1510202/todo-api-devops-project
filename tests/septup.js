/**
 * Jest Test Setup File
 * Runs before each test file
 */

require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/todoapp_test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.ENABLE_NOTIFICATIONS = 'false';
process.env.LOG_LEVEL = 'error';

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests (except for errors)
const originalConsole = global.console;

global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // Keep errors visible
  debug: jest.fn()
};

// Global test utilities
global.testUtils = {
  // Generate test data
  generateTodoData: (overrides = {}) => ({
    title: `Test Todo ${Date.now()}`,
    description: 'This is a test todo description',
    priority: 'medium',
    ...overrides
  }),

  // Wait helper
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Clean up database (if using real database in tests)
  cleanupDatabase: async () => {
    // Implementation would depend on your database setup
    // For now, just a placeholder
    return Promise.resolve();
  },

  // Create test user
  createTestUser: () => ({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user'
  }),

  // Mock request/response objects
  mockReq: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides
  }),

  mockRes: () => {
    const res = {
      status: jest.fn(),
      json: jest.fn(),
      send: jest.fn(),
      cookie: jest.fn(),
      header: jest.fn()
    };
    
    // Make methods chainable
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    res.send.mockReturnValue(res);
    res.cookie.mockReturnValue(res);
    res.header.mockReturnValue(res);
    
    return res;
  },

  // Extract response data from mock
  getResponseData: (mockRes) => {
    const statusCall = mockRes.status.mock.calls[0];
    const jsonCall = mockRes.json.mock.calls[0];
    
    return {
      status: statusCall ? statusCall[0] : undefined,
      data: jsonCall ? jsonCall[0] : undefined
    };
  }
};

// Global beforeEach setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Global afterEach cleanup
afterEach(async () => {
  // Cleanup after each test
  await global.testUtils.cleanupDatabase();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Custom matchers
expect.extend({
  toBeValidTodo(received) {
    const pass = (
      received &&
      typeof received.id === 'number' &&
      typeof received.title === 'string' &&
      typeof received.completed === 'boolean' &&
      ['low', 'medium', 'high'].includes(received.priority) &&
      received.created_at &&
      received.updated_at
    );

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid todo`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid todo`,
        pass: false
      };
    }
  },

  toBeValidApiResponse(received) {
    const pass = (
      received &&
      (received.data !== undefined || received.error !== undefined)
    );

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid API response`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid API response`,
        pass: false
      };
    }
  }
});

// Export for use in other test files
module.exports = {
  testUtils: global.testUtils
};