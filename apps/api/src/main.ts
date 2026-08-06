import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = await buildApp(config);

try {
  await app.listen({ port: config.PORT, host: config.HOST });
  app.log.info(`Wardfy API listening on ${config.API_ORIGIN}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
