import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { z } from 'zod';

const submitSchema = z.object({
  sessionId: z.string(),
  accessCode: z.string().optional().nullable(),
  totalScore: z.number(),
  standardizedScore: z.number(),
  grade: z.string(),
  probability: z.string(),
  attitudeLevel: z.string(),
  reasonType: z.string(),
  sections: z.object({
    base: z.number(),
    reason: z.number(),
    status: z.number(),
    conditions: z.number(),
    deep: z.number(),
  }),
  answers: z.any(),
  aiReport: z.string().optional().nullable(),
  ipAddress: z.string().optional(),
});

export class AssessmentController {
  // 接收测评数据
  static async submit(req: AuthRequest, res: Response) {
    try {
      const data = submitSchema.parse(req.body);

      const assessment = await prisma.assessment.create({
        data: {
          sessionId: data.sessionId,
          accessCode: data.accessCode || null,
          totalScore: data.totalScore,
          standardizedScore: data.standardizedScore,
          grade: data.grade,
          probability: data.probability,
          attitudeLevel: data.attitudeLevel,
          reasonType: data.reasonType,
          sections: JSON.stringify(data.sections),
          answers: JSON.stringify(data.answers),
          aiReport: data.aiReport || null,
          ipAddress: data.ipAddress || req.ip,
        },
      });

      res.json({
        success: true,
        id: assessment.id,
      });
    } catch (error: any) {
      console.error('Submit assessment error:', error);
      res.status(400).json({ error: error.message || 'Submit failed' });
    }
  }

  // 获取测评列表
  static async list(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [assessments, total] = await Promise.all([
        prisma.assessment.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.assessment.count(),
      ]);

      const items = assessments.map((a) => ({
        ...a,
        sections: JSON.parse(a.sections),
        answers: JSON.parse(a.answers),
      }));

      res.json({
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error: any) {
      console.error('List assessments error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // 获取测评详情
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const assessment = await prisma.assessment.findUnique({
        where: { id },
      });

      if (!assessment) {
        return res.status(404).json({ error: 'Assessment not found' });
      }

      res.json({
        ...assessment,
        sections: JSON.parse(assessment.sections),
        answers: JSON.parse(assessment.answers),
      });
    } catch (error: any) {
      console.error('Get assessment error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // 获取统计数据
  static async stats(req: AuthRequest, res: Response) {
    try {
      const total = await prisma.assessment.count();
      
      const assessments = await prisma.assessment.findMany({
        select: {
          standardizedScore: true,
          grade: true,
          createdAt: true,
        },
      });

      const avgScore = assessments.length > 0
        ? Math.round(assessments.reduce((sum, a) => sum + a.standardizedScore, 0) / assessments.length)
        : 0;

      const gradeDistribution = assessments.reduce((acc, a) => {
        acc[a.grade] = (acc[a.grade] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // 计算30天测评趋势
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentAssessments = await prisma.assessment.findMany({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        select: {
          createdAt: true,
        },
      });

      // 按日期统计
      const trendData: Record<string, number> = {};
      const today = new Date();
      
      // 初始化30天的数据（值为0）
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        trendData[dateStr] = 0;
      }
      
      // 统计每天的测评数量
      recentAssessments.forEach(assessment => {
        const dateStr = new Date(assessment.createdAt).toISOString().split('T')[0];
        if (trendData.hasOwnProperty(dateStr)) {
          trendData[dateStr]++;
        }
      });

      // 转换为数组格式
      const trend = Object.entries(trendData).map(([date, count]) => ({
        date,
        count,
      }));

      res.json({
        total,
        avgScore,
        gradeDistribution,
        trend,
      });
    } catch (error: any) {
      console.error('Stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
