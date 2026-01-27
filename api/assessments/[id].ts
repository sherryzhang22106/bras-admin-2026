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

    const id = req.query.id as string;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      return res.status(404).json({ error: '测评记录不存在' });
    }

    // 解析 JSON 字段
    const result = {
      ...assessment,
      sections: assessment.sections ? JSON.parse(assessment.sections) : {},
      answers: assessment.answers ? JSON.parse(assessment.answers) : {},
    };

    res.json(result);
  } catch (error: any) {
    console.error('Get assessment error:', error);
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      res.status(500).json({ error: '获取详情失败' });
    }
  } finally {
    await prisma.$disconnect();
  }
}
