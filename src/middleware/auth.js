const jwt = require('jsonwebtoken');
require('dotenv').config();

// Authentication middleware
const auth = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No authorization header provided'
      });
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid authorization format. Use: Bearer <token>'
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user info
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      req.user = null;
      return next();
    }

    // Try to verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    // Invalid token, but don't fail the request
    req.user = null;
    next();
  }
};

// Generate JWT token
const generateToken = (userId, email, expiresIn = null) => {
  const payload = {
    userId,
    email,
    iat: Math.floor(Date.now() / 1000)
  };

  const options = {};
  if (expiresIn) {
    options.expiresIn = expiresIn;
  } else {
    options.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
};

// Admin authentication middleware
const adminAuth = (req, res, next) => {
  try {
    // First check if user is authenticated
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user has admin role
    if (!decoded.isAdmin) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'Admin privileges required'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Token expired'
      });
    }

    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
};

// Rate limiting by user
const createUserRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user?.userId || req.ip;
    const now = Date.now();
    
    if (!requests.has(userId)) {
      requests.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userRequests = requests.get(userId);
    
    if (now > userRequests.resetTime) {
      // Reset window
      requests.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (userRequests.count >= max) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((userRequests.resetTime - now) / 1000)} seconds.`
      });
    }

    userRequests.count++;
    next();
  };
};

// Request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.originalUrl} - IP: ${req.ip} - User: ${req.user?.userId || 'anonymous'}`);
  
  // Log response
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    console.log(`📤 ${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    originalSend.call(this, body);
  };
  
  next();
};

// Validate API key middleware (alternative to JWT)
const validateApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'API key required'
    });
  }

  // In a real application, you would validate against a database
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'Invalid API key'
    });
  }

  next();
};

module.exports = {
  auth,
  optionalAuth,
  adminAuth,
  generateToken,
  verifyToken,
  createUserRateLimit,
  requestLogger,
  validateApiKey
};