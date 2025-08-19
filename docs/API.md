# Todo API Documentation

## Overview

The Todo API is a RESTful web service for managing todo items. It provides full CRUD operations, search functionality, statistics, and email notifications.

**Base URL:** `https://your-service-url.run.app` or `http://localhost:3000`

## Authentication

Currently, the API runs in demo mode without authentication requirements. For production use, JWT authentication can be enabled.

## API Endpoints

### Health Check

#### GET /health
Returns the health status of the API.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production",
  "version": "1.0.0"
}
```

### Root Endpoint

#### GET /
Returns API information and available endpoints.

**Response:**
```json
{
  "message": "Todo API - DevOps Project",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "todos": "/api/v1/todos",
    "documentation": "/api/v1/docs"
  }
}
```

## Todo Management

### Get All Todos

#### GET /api/v1/todos

Retrieves a list of todos with pagination and filtering options.

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 10, max: 100)
- `status` (string, optional): Filter by completion status (`completed`, `pending`)
- `priority` (string, optional): Filter by priority (`low`, `medium`, `high`)

**Example Request:**
```
GET /api/v1/todos?page=1&limit=5&priority=high&status=pending
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Complete project documentation",
      "description": "Write comprehensive API documentation",
      "completed": false,
      "priority": "high",
      "due_date": "2024-01-20T00:00:00.000Z",
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 25,
    "pages": 5
  }
}
```

### Get Todo by ID

#### GET /api/v1/todos/:id

Retrieves a specific todo by its ID.

**Parameters:**
- `id` (integer): Todo ID

**Response:**
```json
{
  "data": {
    "id": 1,
    "title": "Complete project documentation",
    "description": "Write comprehensive API documentation",
    "completed": false,
    "priority": "high",
    "due_date": "2024-01-20T00:00:00.000Z",
    "created_at": "2024-01-15T10:00:00.000Z",
    "updated_at": "2024-01-15T10:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "error": "Todo not found",
  "message": "Todo with ID 999 does not exist"
}
```

### Create Todo

#### POST /api/v1/todos

Creates a new todo item.

**Request Body:**
```json
{
  "title": "Learn Docker",
  "description": "Complete Docker tutorial and practice",
  "priority": "medium",
  "dueDate": "2024-01-25T00:00:00.000Z"
}
```

**Required Fields:**
- `title` (string): Todo title (1-255 characters)

**Optional Fields:**
- `description` (string): Todo description (max 1000 characters)
- `priority` (string): Priority level (`low`, `medium`, `high`, default: `medium`)
- `dueDate` (ISO date string): Due date

**Response (201):**
```json
{
  "data": {
    "id": 5,
    "title": "Learn Docker",
    "description": "Complete Docker tutorial and practice",
    "completed": false,
    "priority": "medium",
    "due_date": "2024-01-25T00:00:00.000Z",
    "created_at": "2024-01-15T11:00:00.000Z",
    "updated_at": "2024-01-15T11:00:00.000Z"
  },
  "message": "Todo created successfully"
}
```

**Validation Error (400):**
```json
{
  "error": "Validation error",
  "message": "\"title\" is required"
}
```

### Update Todo

#### PUT /api/v1/todos/:id

Updates an existing todo item.

**Parameters:**
- `id` (integer): Todo ID

**Request Body:**
```json
{
  "title": "Learn Docker and Kubernetes",
  "description": "Complete both Docker and Kubernetes tutorials",
  "priority": "high",
  "completed": true,
  "dueDate": "2024-01-30T00:00:00.000Z"
}
```

**Response (200):**
```json
{
  "data": {
    "id": 5,
    "title": "Learn Docker and Kubernetes",
    "description": "Complete both Docker and Kubernetes tutorials",
    "completed": true,
    "priority": "high",
    "due_date": "2024-01-30T00:00:00.000Z",
    "created_at": "2024-01-15T11:00:00.000Z",
    "updated_at": "2024-01-15T12:00:00.000Z"
  },
  "message": "Todo updated successfully"
}
```

### Complete Todo

#### PATCH /api/v1/todos/:id/complete

Marks a todo as completed.

**Parameters:**
- `id` (integer): Todo ID

**Response (200):**
```json
{
  "data": {
    "id": 5,
    "title": "Learn Docker and Kubernetes",
    "completed": true,
    "updated_at": "2024-01-15T12:30:00.000Z"
  },
  "message": "Todo marked as completed"
}
```

### Uncomplete Todo

#### PATCH /api/v1/todos/:id/uncomplete

Marks a todo as not completed.

**Parameters:**
- `id` (integer): Todo ID

**Response (200):**
```json
{
  "data": {
    "id": 5,
    "title": "Learn Docker and Kubernetes",
    "completed": false,
    "updated_at": "2024-01-15T12:35:00.000Z"
  },
  "message": "Todo marked as not completed"
}
```

### Delete Todo

#### DELETE /api/v1/todos/:id

Deletes a todo item.

**Parameters:**
- `id` (integer): Todo ID

**Response (200):**
```json
{
  "message": "Todo deleted successfully",
  "data": {
    "id": 5
  }
}
```

## Search and Statistics

### Search Todos

#### GET /api/v1/todos/search

Searches todos by title or description.

**Query Parameters:**
- `q` (string, required): Search query
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 10)

**Example Request:**
```
GET /api/v1/todos/search?q=docker&page=1&limit=5
```

**Response:**
```json
{
  "data": [
    {
      "id": 5,
      "title": "Learn Docker and Kubernetes",
      "description": "Complete both Docker and Kubernetes tutorials",
      "completed": false,
      "priority": "high"
    }
  ],
  "search": {
    "query": "docker",
    "page": 1,
    "limit": 5,
    "results": 1
  }
}
```

### Get Statistics

#### GET /api/v1/todos/stats

Returns comprehensive todo statistics.

**Response:**
```json
{
  "data": {
    "total": 50,
    "completed": 20,
    "pending": 30,
    "by_priority": {
      "high": 10,
      "medium": 25,
      "low": 15
    },
    "overdue": 5
  }
}
```

## Error Handling

The API uses standard HTTP status codes and returns consistent error responses.

### Error Response Format

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Common Errors

**Validation Error (400):**
```json
{
  "error": "Validation error",
  "message": "\"title\" length must be at least 1 characters long"
}
```

**Not Found Error (404):**
```json
{
  "error": "Todo not found",
  "message": "Todo with ID 999 does not exist"
}
```

**Rate Limit Error (429):**
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Limit:** 100 requests per 15-minute window per IP
- **Headers:** Rate limit information is included in response headers:
  - `X-RateLimit-Limit`: Request limit per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when the window resets

## Data Models

### Todo Model

```typescript
interface Todo {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string; // ISO date string
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}
```

### Priority Levels

- `low`: Non-urgent tasks
- `medium`: Regular priority tasks (default)
- `high`: Urgent tasks (triggers email notifications)

## Email Notifications

When enabled, the API sends email notifications for:
- **High Priority Todos:** When a high-priority todo is created
- **Completion:** When a todo is marked as completed
- **Due Date Reminders:** For todos approaching their due date

## Examples

### Creating a High Priority Todo

```bash
curl -X POST https://your-api-url/api/v1/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Critical Bug Fix",
    "description": "Fix production critical bug in authentication",
    "priority": "high",
    "dueDate": "2024-01-16T18:00:00.000Z"
  }'
```

### Getting Overdue Todos

```bash
curl "https://your-api-url/api/v1/todos?status=pending" | \
  jq '.data[] | select(.due_date != null and (.due_date | fromdateiso8601) < now)'
```

### Bulk Operations

While not directly supported, you can use the API programmatically for bulk operations:

```javascript
// Example: Mark all pending todos as completed
const response = await fetch('/api/v1/todos?status=pending');
const { data: todos } = await response.json();

for (const todo of todos) {
  await fetch(`/api/v1/todos/${todo.id}/complete`, {
    method: 'PATCH'
  });
}
```

## Testing the API

### Using curl

```bash
# Health check
curl https://your-api-url/health

# Get all todos
curl https://your-api-url/api/v1/todos

# Create a todo
curl -X POST https://your-api-url/api/v1/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Todo", "priority": "medium"}'

# Update a todo
curl -X PUT https://your-api-url/api/v1/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

### Using the Deployment Test Script

```bash
# Test deployed application
node scripts/test-deployment.js https://your-api-url
```

## Support

For issues or questions about the API, please check the documentation or create an issue in the project repository.