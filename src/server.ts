import http from 'http';
import { app } from './app';
import { config } from './config';
import { db, checkDatabaseConnection } from './database/connection';

async function bootstrap(): Promise<void> {
  try {
    console.log(`[CentaurAuth] Initializing in ${config.env} mode...`);

    // Verify database connectivity
    console.log('[CentaurAuth] Testing database connection...');
    await checkDatabaseConnection();
    console.log('[CentaurAuth] Database connection successful.');

    // Auto-run pending Knex migrations on startup (optional convenience)
    console.log('[CentaurAuth] Running database migrations...');
    await db.migrate.latest();
    console.log('[CentaurAuth] Migrations are up to date.');

    const server = http.createServer(app);

    server.listen(config.port, () => {
      console.log(`[CentaurAuth] Server listening on port ${config.port}`);
      console.log(`[CentaurAuth] Ready to accept requests.`);
    });

    // Graceful shutdown handling
    const handleShutdown = async (signal: string) => {
      console.log(`\n[CentaurAuth] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log('[CentaurAuth] HTTP server closed.');
        try {
          await db.destroy();
          console.log('[CentaurAuth] Database connection pool destroyed.');
          process.exit(0);
        } catch (err) {
          console.error('[CentaurAuth] Error during database shutdown:', err);
          process.exit(1);
        }
      });

      // Force exit after 10 seconds if shutdown hangs
      setTimeout(() => {
        console.error('[CentaurAuth] Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    console.error('[CentaurAuth] Failed to bootstrap application:', error);
    process.exit(1);
  }
}

// Only start the server if not in test environment
if (config.env !== 'test') {
  bootstrap();
}
