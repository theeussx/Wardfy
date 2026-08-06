import { createHmac, timingSafeEqual } from 'node:crypto';

export interface SessionPayload {
  userId: string;
  discordId?: string;
  expiresAt: number;
}

export class SessionSigner {
  constructor(private readonly secret: string) {}

  issue(userId: string, discordId?: string): string {
    const payload: SessionPayload = {
      userId,
      discordId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${body}.${this.sign(body)}`;
  }

  verify(value?: string): SessionPayload | null {
    if (!value) return null;
    const [body, signature] = value.split('.');
    if (!body || !signature) return null;
    const expected = Buffer.from(this.sign(body));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
      return payload.expiresAt > Date.now() ? payload : null;
    } catch {
      return null;
    }
  }

  private sign(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
  }
}
