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

    const { batchId } = req.query;

    if (!batchId || typeof batchId !== 'string') {
      return res.status(400).json({ error: '缺少批次ID' });
    }

    // 获取指定批次的兑换码
    const codes = await prisma.accessCode.findMany({
      where: { batchId },
      orderBy: { createdAt: 'desc' },
      select: {
        code: true,
        batchId: true,
        createdAt: true,
      },
    });

    if (codes.length === 0) {
      return res.status(404).json({ error: '未找到该批次的兑换码' });
    }

    // 生成 CSV 内容
    const csvHeader = '兑换码,批次,生成时间\n';
    const csvContent = codes.map(c =>
      `${c.code},${c.batchId || ''},${c.createdAt.toISOString()}`
    ).join('\n');
    const csv = csvHeader + csvContent;

    // 设置响应头，返回 CSV 文件
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=access-codes-${batchId}.csv`);

    // 添加 BOM 以支持 Excel 正确显示中文
    res.send('\uFEFF' + csv);
  } catch (error: any) {
    console.error('Export codes error:', error);
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      res.status(500).json({ error: '导出失败' });
    }
  } finally {
    await prisma.$disconnect();
  }
}
