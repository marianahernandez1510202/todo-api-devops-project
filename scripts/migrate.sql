-- Migration script for Cloud SQL PostgreSQL
-- Run this after creating your Cloud SQL instance

-- Create database (si no existe)
-- CREATE DATABASE todoapp;

-- Connect to todoapp database
\c todoapp;

-- Create todos table with enhanced features
CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255), -- Para futura autenticación
    tags TEXT[], -- Array de tags
    category VARCHAR(100)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO todos (title, description, priority, category) VALUES
('Setup Cloud SQL', 'Configure PostgreSQL instance in Google Cloud', 'high', 'DevOps'),
('Deploy API', 'Deploy todo API to Cloud Run', 'high', 'DevOps'),
('Add authentication', 'Implement JWT authentication', 'medium', 'Security'),
('Add tests', 'Write unit and integration tests', 'medium', 'Testing'),
('Setup monitoring', 'Configure logging and metrics', 'low', 'Monitoring')
ON CONFLICT DO NOTHING;

-- Create users table for future authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Add foreign key constraint to todos table
ALTER TABLE todos 
ADD CONSTRAINT fk_todos_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;