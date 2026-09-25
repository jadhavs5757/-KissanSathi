import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import farmsRoutes from './routes/farms.routes.js';
import cropCyclesRoutes from './routes/cropCycles.routes.js';
import schemesRoutes from './routes/schemes.routes.js';
import aiRoutes from './routes/ai.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false // Allows client Vite HMR and API fetches seamlessly
  })
);

// CORS configuration
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin in prod)
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.replit.dev') || origin.endsWith('.replit.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback allow in development
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Request parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Apply rate limiting to all /api routes
app.use('/api', generalLimiter);

// Health check endpoint (Section 12)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'kisansaarthi-api',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/farms', farmsRoutes);
app.use('/api/crop-cycles', cropCyclesRoutes);
app.use('/api/schemes', schemesRoutes);
app.use('/api/ai', aiRoutes);

// In production, serve frontend client build
const clientDistPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  // If requesting an API route that was not found, pass to 404 handler
  if (req.url.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `API route ${req.method} ${req.url} does not exist.`
      }
    });
  }

  // Otherwise serve React SPA index.html
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      next();
    }
  });
});

// Centralized error handling
app.use(errorHandler);

export default app;
