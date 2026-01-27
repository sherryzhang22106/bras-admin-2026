import { Request, Response } from 'express';
import prisma from '../config/database';
import { z } from 'zod';
import axios from 'axios';

const verifyCodeSchema = z.object({
  code: z.string(),
});

const generateReportSchema = z.object({
  scores: z.object({
    total: z.number(),
    standardized: z.number(),
    grade: z.string(),
    probability: z.string(),
    attitudeLevel: z.string(),
    reasonType: z.string(),
    base: z.number(),
    reason: z.number(),
    status: z.number(),
    conditions: z.number(),
    deep: z.number(),
  }),
  answers: z.record(z.any()),
  primaryType: z.string(),
});

const saveAssessmentSchema = z.object({
  sessionId: z.string(),
  answers: z.record(z.any()),
  scores: z.any(),
  aiReport: z.string().optional(),
  accessCode: z.string().optional(),
});

export class BrasController {
  /**
   * 验证访问码
   */
  static async verifyAccessCode(req: Request, res: Response) {
    try {
      const { code } = verifyCodeSchema.parse(req.body);

      // 查找访问码
      const accessCode = await prisma.accessCode.findUnique({
        where: { code },
      });

      if (!accessCode) {
        return res.status(401).json({
          success: false,
          message: '访问码不存在',
        });
      }

      if (accessCode.isUsed) {
        return res.status(401).json({
          success: false,
          message: '访问码已被使用',
        });
      }

      // 标记为已使用
      await prisma.accessCode.update({
        where: { code },
        data: {
          isUsed: true,
          usedAt: new Date(),
          usedByIp: req.ip || 'unknown',
        },
      });

      res.json({
        success: true,
        message: '验证成功',
      });
    } catch (error: any) {
      console.error('Verify access code error:', error);
      res.status(500).json({
        success: false,
        message: '验证失败',
      });
    }
  }

  /**
   * 生成 AI 深度报告（DeepSeek API）
   */
  static async generateReport(req: Request, res: Response) {
    try {
      const { scores, answers, primaryType } = generateReportSchema.parse(req.body);

      const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
      if (!DEEPSEEK_API_KEY) {
        return res.status(500).json({
          error: 'DeepSeek API 未配置',
        });
      }

      // 构建答题摘要
      const answerSummary = Object.entries(answers)
        .map(([qId, option]: [string, any]) => `Q${qId}: ${option.text}`)
        .join('\n');

      // DeepSeek API 提示词
      const prompt = `请基于以下评估报告，为用户生成一份深度个性化的挽回分析和行动方案。

【核心数据摘要】
- 挽回成功率得分: ${scores.standardized}/100
- 挽回等级: ${scores.grade}
- 预估成功率: ${scores.probability}
- 对方当前态度: ${scores.attitudeLevel}
- 核心分手原因: ${scores.reasonType}
- 依恋类型推断: ${primaryType}

【用户详细答题摘要】
${answerSummary}

【严格要求】
1. 称谓统一：禁止使用"他"或"她"，必须统一使用"TA"来指代对方。
2. 语言风格：绝不使用"收到你的评估请求后"、"我们的专业团队"、"为您进行深度拆解"等带有距离感的官僚表达。语气要温暖、直接、深邃，像一位懂心理学的老友。
3. 表达禁忌：严禁使用"绝对不要"、"必须"、"绝不"等武断、生硬的措辞。请改为"建议不要"、"不建议"、"或许可以尝试避免"等建议性且委婉的表达。
4. 语言红线：严禁出现"高攀不起"、"卑微"、"舔狗"、"纠缠"等贬低性词汇。
5. 符号红线：输出内容必须是干净的纯文本。严禁使用任何 Markdown 符号，包括但不限于：##、#、**、__、*、-、> 等。不要使用任何格式化标记，只使用纯文本和段落换行。
6. 字数目标：内容要极度详实，包含大量具体场景分析与话术，向 8000 字靠拢。

【报告结构】（纯文本，无任何符号）

一、关系底色：核心模式深度解析
（深入剖析你们关系的本质模式，包括依恋风格互动、权力动态、情感需求错位等）

二、潜意识回响：防御机制解构
（揭示TA的分手决策背后的深层心理防御机制，以及这些防御机制如何影响当前局面）

三、内在锚点：优势与改变契机
（识别关系中的稳固连接点和破局契机，找到可以撬动局面的关键要素）

四、安全感重塑：分阶段成长方案
（提供具体的、可操作的分阶段行动方案，包括内在成长和外在策略）

五、结语：书写新的依恋故事
（前瞻性总结和心态建设）

请开始生成报告：`;

      // 调用 DeepSeek API
      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一位资深的情感关系心理咨询师，擅长依恋理论、关系动力学分析。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 8000,
          temperature: 0.7,
          stream: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
          timeout: 120000, // 120秒超时
        }
      );

      const report = response.data.choices[0].message.content;

      res.json({
        success: true,
        report,
      });
    } catch (error: any) {
      console.error('Generate report error:', error);
      
      if (error.response) {
        console.error('DeepSeek API Error:', error.response.data);
      }

      res.status(500).json({
        error: error.message || '生成报告失败',
      });
    }
  }

  /**
   * 保存测评记录
   */
  static async saveAssessment(req: Request, res: Response) {
    try {
      const { sessionId, answers, scores, aiReport, accessCode } =
        saveAssessmentSchema.parse(req.body);

      // 检查是否已存在
      const existing = await prisma.brasReconciliationAssessment.findUnique({
        where: { sessionId },
      });

      if (existing) {
        return res.json({
          success: true,
          message: '记录已存在',
        });
      }

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

      res.json({
        success: true,
        message: '保存成功',
      });
    } catch (error: any) {
      console.error('Save assessment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || '保存失败',
      });
    }
  }

  /**
   * 获取历史记录
   */
  static async getAssessmentHistory(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;

      const records = await prisma.brasReconciliationAssessment.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
      });

      const items = records.map((r) => ({
        ...r,
        answers: JSON.parse(r.answers),
        scores: JSON.parse(r.scores),
      }));

      res.json({
        records: items,
      });
    } catch (error: any) {
      console.error('Get history error:', error);
      res.status(500).json({
        records: [],
      });
    }
  }
}
