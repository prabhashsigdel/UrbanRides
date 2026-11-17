import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { toNodeHandler } from 'better-auth/node';
import vehicleRouter from './Routes/VehicleRouter.js';
import bookingRouter from './Routes/BookingRouter.js';
import adminRouter from './Routes/AdminRouter.js';
import accountRouter from './Routes/AccountRouter.js';
import { clientOrigins } from './lib/auth.js';
import { UPLOAD_DIR as uploadDir } from './lib/uploads.js';

// The Vite build. When it exists, the site and the API are served from one origin.
const FRONTEND_DIST = process.env.FRONTEND_DIST
  || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend/dist');
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF guard for our own routes (Better Auth checks its own). Browsers always send Origin on
 * cross-origin writes, so a write from a page we don't trust is refused before it runs.
 */
function rejectUntrustedOrigins(allowed) {
  return (req, res, next) => {
    const origin = req.get('Origin');
    if (SAFE_METHODS.has(req.method) || !origin || allowed.includes(origin)) return next();
    res.status(403).json({ message: 'Request origin not allowed' });
  };
}

/** Serves the built frontend, and its index.html for client-side routes like /my-orders. */
function serveFrontend(app) {
  // Vite fingerprints everything in assets/, so those files can be cached for good.
  app.use('/assets', express.static(path.join(FRONTEND_DIST, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(FRONTEND_DIST, { index: false }));
  app.get(/^(?!\/(api|uploads)\/).*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

/** Builds the Express app around a Better Auth instance (see lib/auth.js). */
export function createApp(auth) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  const app = express();
  const origins = clientOrigins();

  app.use(cors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }));

  // Better Auth reads the raw body itself, so it's mounted before express.json().
  app.all('/api/auth/*', toNodeHandler(auth));

  app.use(rejectUntrustedOrigins(origins));
  app.use(express.json());
  app.use('/api/vehicles', vehicleRouter(auth));
  app.use('/api/bookings', bookingRouter(auth));
  app.use('/api/admin', adminRouter(auth));
  app.use('/api/account', accountRouter(auth));
  app.use('/uploads', express.static(uploadDir, {
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  }));

  if (fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
    serveFrontend(app);
  }

  app.use((req, res) => res.status(404).json({ message: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'Request body is not valid JSON' });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'That image is over 5 MB' });
    }
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error!' });
  });

  return app;
}
