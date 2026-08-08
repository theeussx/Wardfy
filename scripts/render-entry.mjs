import { spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { URL } from 'node:url';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDB() {
  const urlStr = process.env.DATABASE_URL;
  if (!urlStr) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const url = new URL(urlStr);
  const host = url.hostname;
  const port = parseInt(url.port || '5432', 10);

  for (let i = 1; i <= 30; i++) {
    try {
      await new Promise((resolve, reject) => {
        const s = createConnection(port, host, () => {
          s.end();
          resolve();
        });
        s.setTimeout(2000);
        s.once('timeout', () => {
          s.destroy();
          reject(new Error('timeout'));
        });
        s.once('error', () => reject(new Error('connection error')));
      });
      console.log('PostgreSQL is ready.');
      return;
    } catch {
      console.log(`Waiting for PostgreSQL... (${i}/30)`);
      await sleep(2000);
    }
  }
  console.error('PostgreSQL did not become ready within 60 seconds.');
  process.exit(1);
}

await waitForDB();

console.log('Running database migrations...');
const migrate = spawnSync(
  'npm',
  ['run', 'db:deploy', '--workspace=@wardfy/api'],
  { stdio: 'inherit', env: process.env, shell: true }
);
if (migrate.status !== 0) {
  console.error('Migration failed (exit ' + migrate.status + ')');
  process.exit(migrate.status || 1);
}

console.log('Starting API server...');
const server = spawnSync(
  'node',
  ['apps/api/dist/main.js'],
  { stdio: 'inherit', env: process.env }
);
process.exit(server.status || 0);
