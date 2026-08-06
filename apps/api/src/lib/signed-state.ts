import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface OAuthStatePayload {
  provider: 'spotify' | 'discord';
  nonce: string;
  returnTo: string;
  issuedAt: number;
}

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const decode = <T>(value: string): T =>
  JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;

export class SignedState {
  constructor(private readonly secret: string) {}

  issue(provider: OAuthStatePayload['provider'], returnTo = '/'): string {
    const payload: OAuthStatePayload = {
      provider,
      nonce: randomBytes(18).toString('base64url'),
      returnTo: sanitizeReturnTo(returnTo),
      issuedAt: Date.now(),
    };
    const body = encode(payload);
    return `${body}.${this.sign(body)}`;
  }

  verify(value: string, expectedProvider: OAuthStatePayload['provider']): OAuthStatePayload {
    const [body, signature] = value.split('.');
    if (!body || !signature || !this.matches(body, signature)) {
      throw new Error('OAuth state signature is invalid.');
    }

    const payload = decode<OAuthStatePayload>(body);
    const ageMs = Date.now() - payload.issuedAt;
    if (payload.provider !== expectedProvider || ageMs < 0 || ageMs > 10 * 60 * 1000) {
      throw new Error('OAuth state has expired or belongs to another provider.');
    }
    return payload;
  }

  private sign(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
  }

  private matches(body: string, receivedSignature: string): boolean {
    const expected = Buffer.from(this.sign(body));
    const received = Buffer.from(receivedSignature);
    return expected.length === received.length && timingSafeEqual(expected, received);
  }
}

function sanitizeReturnTo(value: string): string {
  // Only app-relative paths may survive an OAuth round trip; this prevents open redirects.
  return value.startsWith('/') && !value.startsWith('//') ? value : '/';
}
