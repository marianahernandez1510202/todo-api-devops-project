const { Pool } = require('pg');
require('dotenv').config();

// 🔍 DEBUG: Imprimir variables de entorno
console.log('🔍 DEBUG - Environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('All env vars with DATABASE:', Object.keys(process.env).filter(key => key.includes('DATABASE')));

// Database configuration with SSL disabled for Docker
const config = {
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Deshabilitar SSL para Docker local
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
};

// 🔍 DEBUG: Imprimir configuración de la base de datos
console.log('🔍 DEBUG - Database config:');
console.log('Config object:', JSON.stringify(config, null, 2));

// Create connection pool
const pool = new Pool(config);

// 🔍 DEBUG: Imprimir información del pool
console.log('🔍 DEBUG - Pool configuration:');
console.log('Pool host:', pool.options.host);
console.log('Pool port:', pool.options.port);
console.log('Pool database:', pool.options.database);
console.log('Pool user:', pool.options.user);

// Test database connection
async function connectDatabase() {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 segundos
  
  console.log('🔍 DEBUG - Starting connection attempts...');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 DEBUG - Attempt ${attempt}: Trying to connect...`);
      const client = await pool.connect();
      console.log('✅ Database connected successfully');
      
      // Test query
      const result = await client.query('SELECT NOW()');
      console.log('📅 Database time:', result.rows[0].now);
      
      client.release();
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt}/${maxRetries} failed:`, error.message);
      console.log('🔍 DEBUG - Error details:', {
        code: error.code,
        errno: error.errno,
        address: error.address,
        port: error.port,
        syscall: error.syscall
      });
      
      if (attempt === maxRetries) {
        console.error('❌ All database connection attempts failed');
        throw error;
      }
      
      console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Execute query with error handling
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('🔍 Executed query', { duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    throw error;
  }
}

// Get a client from the pool for transactions
async function getClient() {
  return await pool.connect();
}

// Initialize database tables
async function initializeDatabase() {
  const createTableQuery = `
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

    CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
    CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
    CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);

    -- Create updated_at trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
    CREATE TRIGGER update_todos_updated_at
      BEFORE UPDATE ON todos
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await query(createTableQuery);
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database tables:', error.message);
    throw error;
  }
}

// Graceful shutdown
async function closeDatabase() {
  try {
    await pool.end();
    console.log('✅ Database connection pool closed');
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
  }
}

module.exports = {
  pool,
  query,
  getClient,
  connectDatabase,
  initializeDatabase,
  closeDatabase
};