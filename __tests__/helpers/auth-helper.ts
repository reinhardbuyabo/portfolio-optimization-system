
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export function createTestSessionToken(userId: string, role?: Role): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not defined in environment variables.');
  }

  const payload = {
    id: userId,
    role: role || 'USER',
  };

  const token = jwt.sign(payload, secret, {
    expiresIn: '1h',
  });

  return token;
}
