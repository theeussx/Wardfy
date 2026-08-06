import type { FastifyPluginAsync } from 'fastify';

import { requireSession } from '../lib/request-auth.js';
import { SessionSigner } from '../lib/session.js';
import { WardfyDataService } from '../services/wardfy-data.service.js';

interface AccountRouteOptions {
  sessions: SessionSigner;
  data: WardfyDataService;
}

export const accountRoutes: FastifyPluginAsync<AccountRouteOptions> = async (app, options) => {
  app.get('/me', async (request) => {
    const session = options.sessions.verify(request.cookies.wardfy_session);
    if (!session) return { data: { authenticated: false, guilds: [] } };
    return { data: await options.data.getCurrentUser(session.userId) };
  });

  app.post('/me/sync', async (request) => {
    const session = requireSession(request, options.sessions);
    await options.data.syncLibrary(session.userId);
    const dashboard = await options.data.getDashboard(session.userId);
    return { data: dashboard };
  });
};
