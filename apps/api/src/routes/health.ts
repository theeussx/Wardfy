import type { FastifyPluginAsync } from 'fastify';

import type { AppConfig } from '../config.js';

export const healthRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (app, { config }) => {
  const status = () => ({
    status: 'ok',
    service: 'wardfy-api',
    mode: config.DEMO_MODE ? 'demo' : 'production',
    timestamp: new Date().toISOString(),
  });

  app.get('/', async () => ({
    ...status(),
    docs: '/docs',
    apiPrefix: '/v1',
  }));
  app.get('/health', async () => status());
};
