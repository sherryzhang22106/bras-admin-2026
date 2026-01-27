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
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: '请输入兑换码' });
    }

    const accessCode = await prisma.accessCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!accessCode) {
      return res.json({ success: false, error: '兑换码不存在' });
    }

    if (accessCode.isUsed) {
      return res.json({ success: false, error: '兑换码已被使用' });
    }

    // 标记为已使用
    await prisma.accessCode.update({
      where: { id: accessCode.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Verify access code error:', error);
    res.status(500).json({ success: false, error: '验证失败' });
  } finally {
    await prisma.$disconnect();
  }
}
