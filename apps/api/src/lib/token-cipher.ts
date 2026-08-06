import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Encrypts Spotify refresh/access tokens at rest. The payload is versioned so a
 * key-rotation job can safely re-encrypt rows with a newer key later.
 */
export class TokenCipher {
  private readonly key: Buffer;

  constructor(base64Key?: string) {
    if (!base64Key) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('TOKEN_ENCRYPTION_KEY is required outside development.');
      }
      // Deliberately ephemeral in development: restarting invalidates demo tokens.
      this.key = randomBytes(32);
      return;
    }

    const key = Buffer.from(base64Key, 'base64');
    if (key.length !== 32) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
    }
    this.key = key;
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      'v1',
      iv.toString('base64url'),
      tag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decrypt(payload: string): string {
    const [version, ivEncoded, tagEncoded, ciphertextEncoded] = payload.split('.');
    if (version !== 'v1' || !ivEncoded || !tagEncoded || !ciphertextEncoded) {
      throw new Error('Unsupported encrypted token payload.');
    }

    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivEncoded, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  }
}
