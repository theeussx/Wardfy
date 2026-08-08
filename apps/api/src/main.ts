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
  const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1']);
  const originUsesLoopback = loopbackHosts.has(new URL(config.APP_ORIGIN).hostname);
  const callbacksUseLoopback = [config.DISCORD_REDIRECT_URI, config.SPOTIFY_REDIRECT_URI].some(
    (value) => {
      try {
        return loopbackHosts.has(new URL(value).hostname);
      } catch {
        return false;
      }
    },
  );

  if (remoteWorkspace && (originUsesLoopback || callbacksUseLoopback)) {
    logger.warn(
      {
        appOrigin: config.APP_ORIGIN,
        discordCallback: config.DISCORD_REDIRECT_URI,
        spotifyCallback: config.SPOTIFY_REDIRECT_URI,
      },
      'APP_ORIGIN or an OAuth callback points to a loopback host in a remote workspace. The post-login redirect will fall back to the public request origin, but for full provider compatibility set APP_ORIGIN and both provider callbacks to the public https://<codespace>-5173.app.github.dev origin.',
    );
  }
}