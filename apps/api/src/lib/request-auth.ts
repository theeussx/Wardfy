import type { FastifyRequest } from 'fastify';

import { AppError } from './app-error.js';
import { SessionSigner, type SessionPayload } from './session.js';

export function optionalSession(
  request: FastifyRequest,
  sessions: SessionSigner,
): SessionPayload | null {
  return sessions.verify(request.cookies.wardfy_session);
}

export function requireSession(request: FastifyRequest, sessions: SessionSigner): SessionPayload {
  const session = optionalSession(request, sessions);
  if (!session) {
    throw new AppError('Entre com o Discord para acessar o Wardfy.', 401, 'AUTH_REQUIRED');
  }
  return session;
}
