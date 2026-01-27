import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

function verifyToken(req: VercelRequest): any {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, process.env.JWT_SECRET || 'bras-secret');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    verifyToken(req);

    const [total, used, available] = await Promise.all([
      prisma.accessCode.count(),
      prisma.accessCode.count({ where: { isUsed: true } }),
      prisma.accessCode.count({ where: { isUsed: false } }),
    ]);

    res.json({
      total,
      used,
      available,
    });
  } catch (error: any) {
    console.error('Code stats error:', error);
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      res.status(500).json({ error: '获取统计失败' });
    }
  } finally {
    await prisma.$disconnect();
  }
}
