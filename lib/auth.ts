import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export function verifyToken(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return payload;
  } catch (error) {
    throw error;
  }
}