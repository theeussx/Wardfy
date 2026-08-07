import { buildApp } from './app.js';
import { loadConfig } from './config.js';

try {
  const config = loadConfig();
  const app = await buildApp(config);
  await app.listen({ port: config.PORT, host: config.HOST });
  app.log.info(`Wardfy API listening on ${config.API_ORIGIN}`);
  warnForRemoteLocalhostCallbacks(app.log, config);
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

function warnForRemoteLocalhostCallbacks(
  logger: { warn: (payload: object, message?: string) => void },
  config: { APP_ORIGIN: string; DISCORD_REDIRECT_URI: string; SPOTIFY_REDIRECT_URI: string },
): void {
  const remoteWorkspace = Boolean(
    process.env.CODESPACES || process.env.CODESPACE_NAME || process.env.GITPOD_WORKSPACE_URL,
  );
  const callbacksUseLocalhost = [config.DISCORD_REDIRECT_URI, config.SPOTIFY_REDIRECT_URI].some(
    (value) => {
      try {
        return ['localhost', '127.0.0.1', '::1'].includes(new URL(value).hostname);
      } catch {
        return false;
      }
    },
  );

  if (remoteWorkspace && callbacksUseLocalhost) {
    logger.warn(
      { appOrigin: config.APP_ORIGIN },
      'OAuth callbacks point to localhost in a remote workspace. Configure public APP_ORIGIN and provider callbacks through /api/v1/auth/... before logging in.',
    );
  }
}