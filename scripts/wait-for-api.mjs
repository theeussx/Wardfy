#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const env = { ...parseEnv(await readOptional(resolve(process.cwd(), '.env'))), ...process.env };
const origin = (env.API_ORIGIN || 'http://localhost:3001').replace(/\/$/, '');
const deadline = Date.now() + 120_000;

process.stdout.write(`Waiting for Wardfy API at ${origin}…\n`);
while (Date.now() < deadline) {
  try {
    const response = await fetch(`${origin}/health`, { signal: AbortSignal.timeout(2_000) });
    if (response.ok) {
      console.log('Wardfy API is ready.');
      process.exit(0);
    }
  } catch {
    // API is still booting its database, migrations or Spotify scheduler.
  }
  await new Promise((resolve) => setTimeout(resolve, 1_000));
}

console.error(`Wardfy API did not become ready at ${origin} within 120 seconds.`);
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
        return [key, raw.replace(/^(['"])(.*)\1$/, '$2')];
      })
      .filter(([key]) => key),
  );
}