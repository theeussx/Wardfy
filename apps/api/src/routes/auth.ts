import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import type { AppConfig } from '../config.js';
import { AppError } from '../lib/app-error.js';
import { SessionSigner } from '../lib/session.js';
import { SignedState } from '../lib/signed-state.js';
import type { UserRepository } from '../repositories/user.repository.js';
import { DiscordOAuthService } from '../services/discord-oauth.service.js';
import { SpotifyOAuthService } from '../services/spotify-oauth.service.js';
import { WardfyDataService } from '../services/wardfy-data.service.js';

interface AuthRouteOptions {
  config: AppConfig;
  state: SignedState;
  sessions: SessionSigner;
  spotify: SpotifyOAuthService;
  discord: DiscordOAuthService;
  users: UserRepository;
  data: WardfyDataService;
}

const startQuery = z.object({ returnTo: z.string().max(200).optional() });
const callbackQuery = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export const authRoutes: FastifyPluginAsync<AuthRouteOptions> = async (app, options) => {
  const secure = options.config.NODE_ENV === 'production';
  const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure, path: '/' };

  app.get('/spotify/start', async (request, reply) => {
    const { returnTo } = startQuery.parse(request.query);
    const state = options.state.issue('spotify', returnTo);
    reply.setCookie('wardfy_spotify_oauth', state, { ...cookieOptions, maxAge: 10 * 60 });
    return reply.redirect(options.spotify.buildAuthorizeUrl(state));
  });

  app.get('/spotify/callback', async (request, reply) => {
    const { code, state, error } = callbackQuery.parse(request.query);
    if (error)
      throw new AppError(
        `Spotify authorization was cancelled: ${error}`,
        400,
        'SPOTIFY_AUTH_CANCELLED',
      );
    if (!code || !state || request.cookies.wardfy_spotify_oauth !== state) {
      throw new AppError('Spotify OAuth state could not be verified.', 400, 'INVALID_OAUTH_STATE');
    }
    const oauthState = options.state.verify(state, 'spotify');
    const session = options.sessions.verify(request.cookies.wardfy_session);
    if (!session) {
      throw new AppError(
        'Connect Discord before connecting Spotify.',
        401,
        'DISCORD_LOGIN_REQUIRED',
      );
    }

    await options.spotify.exchangeAndStore(code, session.userId);
    // Backfill the Spotify history that is available to the connected account.
    // A transient Spotify failure must not invalidate a successfully completed OAuth flow.
    await options.data.syncLibrary(session.userId).catch((syncError) => {
      request.log.warn(
        syncError,
        'Spotify connected, but initial library sync will retry in the worker.',
      );
    });
    reply.clearCookie('wardfy_spotify_oauth', cookieOptions);
    return reply.redirect(
      toAppUrl(options.config.APP_ORIGIN, oauthState.returnTo, 'spotify=connected'),
    );
  });

  app.get('/discord/start', async (request, reply) => {
    const { returnTo } = startQuery.parse(request.query);
    const state = options.state.issue('discord', returnTo);
    reply.setCookie('wardfy_discord_oauth', state, { ...cookieOptions, maxAge: 10 * 60 });
    return reply.redirect(options.discord.buildAuthorizeUrl(state));
  });

  app.get('/discord/callback', async (request, reply) => {
    const { code, state, error } = callbackQuery.parse(request.query);
    if (error)
      throw new AppError(
        `Discord authorization was cancelled: ${error}`,
        400,
        'DISCORD_AUTH_CANCELLED',
      );
    if (!code || !state || request.cookies.wardfy_discord_oauth !== state) {
      throw new AppError('Discord OAuth state could not be verified.', 400, 'INVALID_OAUTH_STATE');
    }
    const oauthState = options.state.verify(state, 'discord');
    const { profile, guilds } = await options.discord.exchangeCode(code);
    const avatarUrl = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`
      : undefined;
    const user = await options.users.upsertDiscord({
      discordId: profile.id,
      displayName: profile.global_name ?? profile.username,
      avatarUrl,
      locale: profile.locale,
    });
    await options.data.syncDiscordGuildMemberships(user.id, profile.id, guilds);

    reply
      .setCookie('wardfy_session', options.sessions.issue(user.id, profile.id), {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60,
      })
      .clearCookie('wardfy_discord_oauth', cookieOptions);
    return reply.redirect(
      toAppUrl(options.config.APP_ORIGIN, oauthState.returnTo, 'discord=connected'),
    );
  });

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie('wardfy_session', cookieOptions);
    return reply.code(204).send();
  });
};

function toAppUrl(origin: string, path: string, query: string): string {
  const url = new URL(path, origin);
  const [key, value] = query.split('=');
  if (key && value) url.searchParams.set(key, value);
  return url.toString();
}
