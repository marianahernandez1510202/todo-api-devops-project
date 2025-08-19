-- Database initialization script for Todo API
-- This script creates the necessary tables and initial data

-- Create extension for UUID generation (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create todos table
CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create users table (for future authentication features)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create trigger for users updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create user_todos relationship table (for multi-user support)
CREATE TABLE IF NOT EXISTS user_todos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    todo_id INTEGER REFERENCES todos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, todo_id)
);

-- Create indexes for relationship table
CREATE INDEX IF NOT EXISTS idx_user_todos_user_id ON user_todos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_todos_todo_id ON user_todos(todo_id);

-- Create tags table for categorization
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#6c757d', -- Hex color code
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create todo_tags relationship table
CREATE TABLE IF NOT EXISTS todo_tags (
    id SERIAL PRIMARY KEY,
    todo_id INTEGER REFERENCES todos(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(todo_id, tag_id)
);

-- Create indexes for todo_tags
CREATE INDEX IF NOT EXISTS idx_todo_tags_todo_id ON todo_tags(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_tags_tag_id ON todo_tags(tag_id);

-- Create audit log table for tracking changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Insert default admin user (password: 'admin123' hashed with bcrypt)
INSERT INTO users (username, email, password_hash, role) 
VALUES (
    'admin', 
    'admin@todoapp.com', 
    '$2b$10$K7L1OJ45/4Y7//TRDdOx.eO0Ly.HT9W5p1J8g2aLNOFXi0UEBXE4W', 
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Insert default tags
INSERT INTO tags (name, color) VALUES 
    ('Work', '#007bff'),
    ('Personal', '#28a745'),
    ('Urgent', '#dc3545'),
    ('Study', '#6f42c1'),
    ('Health', '#fd7e14'),
    ('Shopping', '#20c997'),
    ('Travel', '#6c757d')
ON CONFLICT (name) DO NOTHING;

-- Insert sample todos for demonstration
INSERT INTO todos (title, description, priority, due_date) VALUES 
    ('Welcome to Todo API', 'This is your first todo item. You can edit or delete it.', 'medium', NULL),
    ('Set up development environment', 'Install Node.js, Docker, and other required tools for the project.', 'high', CURRENT_DATE + INTERVAL '7 days'),
    ('Write API documentation', 'Document all the API endpoints with examples and response formats.', 'medium', CURRENT_DATE + INTERVAL '14 days'),
    ('Deploy to production', 'Set up CI/CD pipeline and deploy the application to cloud platform.', 'high', CURRENT_DATE + INTERVAL '21 days'),
    ('Add user authentication', 'Implement JWT-based authentication system for users.', 'low', CURRENT_DATE + INTERVAL '30 days')
ON CONFLICT DO NOTHING;

-- Create view for todo statistics
CREATE OR REPLACE VIEW todo_stats AS
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE completed = true) as completed,
    COUNT(*) FILTER (WHERE completed = false) as pending,
    COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
    COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority,
    COUNT(*) FILTER (WHERE priority = 'low') as low_priority,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND completed = false) as overdue,
    COUNT(*) FILTER (WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND completed = false) as due_this_week
FROM todos;

-- Create function to get user todo statistics
CREATE OR REPLACE FUNCTION get_user_todo_stats(user_id_param INTEGER)
RETURNS TABLE (
    total BIGINT,
    completed BIGINT,
    pending BIGINT,
    high_priority BIGINT,
    medium_priority BIGINT,
    low_priority BIGINT,
    overdue BIGINT,
    due_this_week BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE t.completed = true) as completed,
        COUNT(*) FILTER (WHERE t.completed = false) as pending,
        COUNT(*) FILTER (WHERE t.priority = 'high') as high_priority,
        COUNT(*) FILTER (WHERE t.priority = 'medium') as medium_priority,
        COUNT(*) FILTER (WHERE t.priority = 'low') as low_priority,
        COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE AND t.completed = false) as overdue,
        COUNT(*) FILTER (WHERE t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND t.completed = false) as due_this_week
    FROM todos t
    JOIN user_todos ut ON t.id = ut.todo_id
    WHERE ut.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old audit logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your setup)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully!';
    RAISE NOTICE 'Tables created: todos, users, user_todos, tags, todo_tags, audit_logs';
    RAISE NOTICE 'Sample data inserted and ready to use.';
END $$;