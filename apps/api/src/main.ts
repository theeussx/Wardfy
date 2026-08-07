import { buildApp } from './app.js';
import { loadConfig } from './config.js';

try {
  const config = loadConfig();
  const app = await buildApp(config);
  await app.listen({ port: config.PORT, host: config.HOST });
  app.log.info(`Wardfy API listening on ${config.API_ORIGIN}`);
} catch (error) {
  const code = isPrismaError(error) ? error.errorCode : undefined;
  if (code === 'P1001') {
    console.error('\nWardfy could not reach PostgreSQL.');
    console.error('Run `npm run infra:up` for local Docker services, then `npm run db:prepare`.');
    console.error(
      'If you use a hosted database, verify DATABASE_URL in the repository-root .env file.\n',
    );
  } else {
    console.error('Wardfy API failed to start:', error);
  }
  process.exit(1);
}

function isPrismaError(error: unknown): error is { errorCode?: string } {
  return typeof error === 'object' && error !== null && 'errorCode' in error;
}