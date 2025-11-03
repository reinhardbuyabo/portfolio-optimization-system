import { sign } from 'jsonwebtoken';

const secret = process.env.AUTH_SECRET || 'secret';

const token = sign(
  {
    user: {
      id: 'clxwqy8pq0000u0z68z6f6z6z',
      role: 'INVESTOR',
      email: 'investor@example.com',
      name: 'Investor User',
    },
  },
  secret,
  { expiresIn: '1d' },
);

console.log(token);