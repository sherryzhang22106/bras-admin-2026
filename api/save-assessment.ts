import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { sessionId, answers, scores, aiReport, accessCode } = req.body;

    if (!sessionId || !answers || !scores) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 检查是否已存在
    const existing = await prisma.brasReconciliationAssessment.findUnique({
      where: { sessionId },
    });

    if (existing) {
      // 更新现有记录
      await prisma.brasReconciliationAssessment.update({
        where: { sessionId },
        data: {
          answers: JSON.stringify(answers),
          scores: JSON.stringify(scores),
          aiReport: aiReport || null,
          accessCode: accessCode || null,
        },
      });
    } else {
      // 创建新记录
      await prisma.brasReconciliationAssessment.create({
        data: {
          sessionId,
          answers: JSON.stringify(answers),
          scores: JSON.stringify(scores),
          aiReport: aiReport || null,
          accessCode: accessCode || null,
        },
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Save assessment error:', error);
    res.status(500).json({ success: false, error: '保存失败' });
  } finally {
    await prisma.$disconnect();
  }
}
