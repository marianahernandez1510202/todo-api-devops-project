const express = require('express');
const cors = require('cors');
const { connectDatabase, initializeDatabase } = require('./src/config/database');

const app = express();

// Cloud Run usa PORT, fallback a 3000 para local
const PORT = process.env.PORT || 3000;

console.log(`🚀 Starting server on port ${PORT}`);

// Middlewares
app.use(cors());
app.use(express.json());

// Health check (IMPORTANTE para Cloud Run)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Todo API - Cloud Run',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/v1/todos', require('./src/routes/todoRoutes'));

// Función para iniciar servidor
async function startServer() {
  try {
    // Conectar base de datos (solo si tienes DATABASE_URL)
    if (process.env.DATABASE_URL) {
      await connectDatabase();
      await initializeDatabase();
      console.log('📊 Database connected');
    } else {
      console.log('⚠️ No DATABASE_URL found, running without database');
    }
    
    // Iniciar servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();