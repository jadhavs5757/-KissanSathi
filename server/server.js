import app from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrations/runMigrations.js';
import { seedSchemes } from './db/seeds/seedSchemes.js';

async function startServer() {
  try {
    // Run migrations on startup
    await runMigrations();
    // Seed verified government schemes
    await seedSchemes();

    app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`🌾 KisanSaarthi AI Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
      console.log(`📡 Health endpoint: http://localhost:${env.PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ Failed to start KisanSaarthi AI server:', err);
    process.exit(1);
  }
}

startServer();
