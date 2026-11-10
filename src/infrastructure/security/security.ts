import bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import type { PasswordHasher, SecureTokens, SessionTokens } from '../../application/ports/services';
import { jwtSecret } from '../config/env';

export class BcryptHasher implements PasswordHasher {
  private dummy?: string;
  hash(plain: string) { return bcrypt.hash(plain, 10); }
  async verify(plain: string, hash: string | null | undefined) {
    this.dummy ??= bcrypt.hashSync('campusconnect-dummy', 10);
    const ok = await bcrypt.compare(plain, hash ?? this.dummy);
    return hash ? ok : false;
  }
}

/** Session : JWT signé (HS256) de 7 jours, transmis dans un cookie httpOnly. */
export class JoseSessionTokens implements SessionTokens {
  private key = () => new TextEncoder().encode(jwtSecret());
  sign(userId: number) {
    return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(String(userId)).setIssuedAt().setExpirationTime('7d').sign(this.key());
  }
  async verify(token: string) {
    try {
      const { payload } = await jwtVerify(token, this.key(), { algorithms: ['HS256'] });
      const id = Number(payload.sub);
      return Number.isInteger(id) ? id : null;
    } catch {
      return null;
    }
  }
}

export class CryptoSecureTokens implements SecureTokens {
  random() { return crypto.randomBytes(32).toString('hex'); }
  hash(token: string) { return crypto.createHash('sha256').update(token).digest('hex'); }
}
