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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    verifyToken(req);

    const { count } = req.body;

    if (!count || count < 1 || count > 100) {
      return res.status(400).json({ error: '数量必须在 1-100 之间' });
    }

    const codes: string[] = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const batchId = `batch_${Date.now()}`;

    for (let i = 0; i < count; i++) {
      let code = 'BRAS-';
      for (let j = 0; j < 8; j++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }

      try {
        await prisma.accessCode.create({
          data: {
            code,
            batchId,
          },
        });
        codes.push(code);
      } catch (error: any) {
        if (error.code !== 'P2002') throw error;
      }
    }

    res.json({
      success: true,
      codes,
      count: codes.length,
      batchId,
    });
  } catch (error: any) {
    console.error('Generate codes error:', error);
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      res.status(500).json({ error: '生成失败' });
    }
  } finally {
    await prisma.$disconnect();
  }
}
