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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      sessionId,
      accessCode,
      standardizedScore,
      grade,
      probability,
      attitudeLevel,
      reasonType,
      sections,
      answers,
      aiReport,
    } = req.body;

    if (!sessionId || !standardizedScore || !grade) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    const assessment = await prisma.assessment.create({
      data: {
        sessionId,
        accessCode,
        totalScore: standardizedScore,
        standardizedScore,
        grade,
        probability: probability || '',
        attitudeLevel: attitudeLevel || '',
        reasonType: reasonType || '',
        sections: JSON.stringify(sections || {}),
        answers: JSON.stringify(answers || {}),
        aiReport: aiReport || null,
      },
    });

    res.json({
      success: true,
      id: assessment.id,
    });
  } catch (error: any) {
    console.error('Submit assessment error:', error);
    res.status(500).json({ error: '提交失败' });
  } finally {
    await prisma.$disconnect();
  }
}
