#!/usr/bin/env node

/**
 * Deployment Testing Script
 * Tests the deployed application to ensure it's working correctly
 */

const https = require('https');
const http = require('http');

class DeploymentTester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || process.env.DEPLOYMENT_URL || 'http://localhost:3000';
    this.tests = [];
    this.results = [];
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const requestLib = url.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DeploymentTester/1.0',
          ...options.headers
        }
      };

      const req = requestLib.request(url, requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: jsonData,
              rawData: data
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: null,
              rawData: data,
              parseError: error.message
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  addTest(name, testFunction) {
    this.tests.push({ name, testFunction });
  }

  async runTest(test) {
    const startTime = Date.now();
    
    try {
      await test.testFunction();
      const duration = Date.now() - startTime;
      
      this.results.push({
        name: test.name,
        status: 'PASS',
        duration,
        error: null
      });
      
      console.log(`✅ ${test.name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        name: test.name,
        status: 'FAIL',
        duration,
        error: error.message
      });
      
      console.log(`❌ ${test.name} (${duration}ms): ${error.message}`);
    }
  }

  async runAllTests() {
    console.log(`🚀 Starting deployment tests for: ${this.baseUrl}`);
    console.log(`📅 Test run started at: ${new Date().toISOString()}`);
    console.log('─'.repeat(60));

    for (const test of this.tests) {
      await this.runTest(test);
    }

    this.printSummary();
    return this.getTestResults();
  }

  printSummary() {
    console.log('─'.repeat(60));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`📊 Test Summary:`);
    console.log(`   Total: ${total}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Duration: ${totalDuration}ms`);
    console.log(`   Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`   - ${r.name}: ${r.error}`);
        });
    }

    console.log('─'.repeat(60));
  }

  getTestResults() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const total = this.results.length;
    
    return {
      success: passed === total,
      passed,
      failed: total - passed,
      total,
      results: this.results
    };
  }
}

// Define all deployment tests
function setupTests(tester) {
  // Health Check Test
  tester.addTest('Health Check', async () => {
    const response = await tester.makeRequest('/health');
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    
    if (!response.data || response.data.status !== 'OK') {
      throw new Error('Health check returned invalid status');
    }
  });

  // API Root Test
  tester.addTest('API Root', async () => {
    const response = await tester.makeRequest('/');
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    
    if (!response.data || !response.data.message) {
      throw new Error('API root returned invalid response');
    }
  });

  // Get Todos Test
  tester.addTest('Get Todos', async () => {
    const response = await tester.makeRequest('/api/v1/todos');
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    
    if (!response.data || !Array.isArray(response.data.data)) {
      throw new Error('Todos endpoint returned invalid format');
    }
    
    if (!response.data.pagination) {
      throw new Error('Missing pagination information');
    }
  });

  // Create Todo Test
  tester.addTest('Create Todo', async () => {
    const todoData = {
      title: `Test Todo ${Date.now()}`,
      description: 'This is a deployment test todo',
      priority: 'medium'
    };

    const response = await tester.makeRequest('/api/v1/todos', {
      method: 'POST',
      body: todoData
    });
    
    if (response.statusCode !== 201) {
      throw new Error(`Expected status 201, got ${response.statusCode}`);
    }
    
    if (!response.data || !response.data.data || !response.data.data.id) {
      throw new Error('Todo creation returned invalid response');
    }
    
    // Store the created todo ID for cleanup or further tests
    tester.createdTodoId = response.data.data.id;
  });

  // Get Specific Todo Test
  tester.addTest('Get Specific Todo', async () => {
    if (!tester.createdTodoId) {
      throw new Error('No todo ID available from previous test');
    }

    const response = await tester.makeRequest(`/api/v1/todos/${tester.createdTodoId}`);
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    
    if (!response.data || !response.data.data || response.data.data.id !== tester.createdTodoId) {
      throw new Error('Get specific todo returned invalid response');
    }
  });

  // Update Todo Test
  tester.addTest('Update Todo', async () => {
    if (!tester.createdTodoId) {
      throw new Error('No todo ID available from previous test');
    }

    const updateData = {
      title: `Updated Test Todo ${Date.now()}`,
      completed: true
    };

    const response = await tester.makeRequest(`/api/v1/todos/${tester.createdTodoId}`, {
      method: 'PUT',
      body: updateData
    });
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    
    if (!response.data || !response.data.data || response.data.data.completed !== true) {
      throw new Error('Todo update returned invalid response');
    }
  });

  // Get Stats Test
  tester.addTest('Get Statistics', async () => {
    const response = await tester.makeRequest('/api/v1/todos/stats');
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    
    if (!response.data || !response.data.data || typeof response.data.data.total !== 'number') {
      throw new Error('Stats endpoint returned invalid format');
    }
  });

  // Search Test
  tester.addTest('Search Todos', async () => {
    const response = await tester.makeRequest('/api/v1/todos/search?q=test');
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    
    if (!response.data || !Array.isArray(response.data.data)) {
      throw new Error('Search endpoint returned invalid format');
    }
  });

  // Error Handling Test
  tester.addTest('404 Error Handling', async () => {
    const response = await tester.makeRequest('/api/v1/nonexistent');
    
    if (response.statusCode !== 404) {
      throw new Error(`Expected status 404, got ${response.statusCode}`);
    }
    
    if (!response.data || !response.data.error) {
      throw new Error('404 error response format is invalid');
    }
  });

  // Performance Test
  tester.addTest('Response Time Check', async () => {
    const startTime = Date.now();
    const response = await tester.makeRequest('/health');
    const responseTime = Date.now() - startTime;
    
    if (responseTime > 5000) {
      throw new Error(`Response time too slow: ${responseTime}ms (expected < 5000ms)`);
    }
    
    if (response.statusCode !== 200) {
      throw new Error(`Health check failed with status ${response.statusCode}`);
    }
  });

  // Cleanup Test (Delete Created Todo)
  tester.addTest('Cleanup - Delete Todo', async () => {
    if (!tester.createdTodoId) {
      console.log('  ⚠️ No todo to delete (test cleanup skipped)');
      return;
    }

    const response = await tester.makeRequest(`/api/v1/todos/${tester.createdTodoId}`, {
      method: 'DELETE'
    });
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
  });
}

// Main execution hola
async function main() {
  const baseUrl = process.argv[2] || process.env.DEPLOYMENT_URL || 'http://localhost:3000';
  
  const tester = new DeploymentTester(baseUrl);
  setupTests(tester);
  
  try {
    const results = await tester.runAllTests();
    
    // Exit with appropriate code
    process.exit(results.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Deployment test runner failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DeploymentTester, setupTests };