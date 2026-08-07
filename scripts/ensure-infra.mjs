#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const env = { ...parseEnv(await readOptional(resolve(root, '.env'))), ...process.env };
const databaseUrl = env.DATABASE_URL;
const redisUrl = env.REDIS_URL;

if (!databaseUrl || !redisUrl) {
  console.error('\nWardfy needs DATABASE_URL and REDIS_URL in the repository-root .env file.');
  process.exit(1);
}

const database = endpoint(databaseUrl, 'PostgreSQL');
const redis = endpoint(redisUrl, 'Redis');
const endpoints = [database, redis];

const initial = await Promise.all(endpoints.map(isReachable));
if (initial.every(Boolean)) {
  console.log('Infrastructure is ready: PostgreSQL and Redis are reachable.');
  process.exit(0);
}

const unavailable = endpoints.filter((_, index) => !initial[index]);
const localOnly = unavailable.every((item) => isLocalHost(item.host));
if (!localOnly) {
  console.error(
    `\nWardfy cannot reach ${unavailable.map((item) => `${item.name} (${item.host}:${item.port})`).join(' and ')}.`,
  );
  console.error(
    'Start those remote services or correct DATABASE_URL / REDIS_URL before running the application.',
  );
  process.exit(1);
}

console.log(`Starting local infrastructure: ${unavailable.map((item) => item.name).join(', ')}…`);
const docker = spawnSync('docker', ['compose', 'up', '-d', 'postgres', 'redis'], {
  cwd: root,
  stdio: 'inherit',
});
if (docker.error || docker.status !== 0) {
  console.error('\nDocker Compose could not start PostgreSQL and Redis.');
  console.error(
    'Install/start Docker, or run PostgreSQL on localhost:5432 and Redis on localhost:6379.',
  );
  process.exit(1);
}

const deadline = Date.now() + 60_000;
while (Date.now() < deadline) {
  const ready = await Promise.all(endpoints.map(isReachable));
  if (ready.every(Boolean)) {
    console.log('Infrastructure is ready.');
    process.exit(0);
  }
  await sleep(1_000);
}

console.error(
  '\nTimed out while waiting for PostgreSQL and Redis. Run `docker compose logs postgres redis` for details.',
);
process.exit(1);

async function readOptional(path) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return '';
  }
}

function parseEnv(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        if (separator < 0) return ['', ''];
        const key = line.slice(0, separator).trim();
        const raw = line.slice(separator + 1).trim();
        const value = raw.replace(/^(['"])(.*)\1$/, '$2');
        return [key, value];
      })
      .filter(([key]) => key),
  );
}

function endpoint(value, name) {
  try {
    const url = new URL(value);
    return {
      name,
      host: url.hostname,
      port: Number(url.port || (url.protocol.startsWith('redis') ? 6379 : 5432)),
    };
  } catch {
    console.error(`\n${name} URL is invalid: ${value}`);
    process.exit(1);
  }
}

function isLocalHost(host) {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function isReachable({ host, port }) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (reachable) => {
      socket.destroy();
      resolve(reachable);
    };
    socket.setTimeout(1_500);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}