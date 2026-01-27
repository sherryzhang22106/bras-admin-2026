import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import crypto from 'crypto';
import { z } from 'zod';
import ExcelJS from 'exceljs';

const generateSchema = z.object({
  count: z.number().min(1).max(1000),
  batchId: z.string().optional(),
});

export class AccessCodeController {
  // 生成访问码
  static async generate(req: AuthRequest, res: Response) {
    try {
      const { count, batchId } = generateSchema.parse(req.body);
      const codes: string[] = [];
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const batchIdValue = batchId || `BATCH_${Date.now()}`;

      for (let i = 0; i < count; i++) {
        let code = 'BRAS-';
        for (let j = 0; j < 8; j++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        
        try {
          await prisma.accessCode.create({
            data: {
              code,
              batchId: batchIdValue,
            },
          });
          codes.push(code);
        } catch (error: any) {
          if (error.code !== 'P2002') {
            throw error;
          }
        }
      }

      res.json({
        success: true,
        codes,
        count: codes.length,
        batchId: batchIdValue,
      });
    } catch (error: any) {
      console.error('Generate codes error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // 获取访问码列表
  static async list(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const filter = req.query.filter as string || 'all';
      const skip = (page - 1) * limit;

      const where = filter === 'used' 
        ? { isUsed: true }
        : filter === 'available'
        ? { isUsed: false }
        : {};

      const [codes, total] = await Promise.all([
        prisma.accessCode.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.accessCode.count({ where }),
      ]);

      res.json({
        items: codes,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error: any) {
      console.error('List codes error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // 统计
  static async stats(req: AuthRequest, res: Response) {
    try {
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
      res.status(500).json({ error: error.message });
    }
  }

  // 导出指定批次的兑换码到Excel
  static async exportBatch(req: AuthRequest, res: Response) {
    try {
      const { batchId } = req.params;
      
      if (!batchId) {
        return res.status(400).json({ error: '批次ID不能为空' });
      }

      // 获取指定批次的兑换码
      const codes = await prisma.accessCode.findMany({
        where: { batchId },
        orderBy: { createdAt: 'desc' },
      });

      if (codes.length === 0) {
        return res.status(404).json({ error: '未找到该批次的兑换码' });
      }

      // 创建工作簿
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('兑换码列表');

      // 设置列
      worksheet.columns = [
        { header: '兑换码', key: 'code', width: 20 },
        { header: '状态', key: 'status', width: 12 },
        { header: '批次ID', key: 'batchId', width: 25 },
        { header: '生成时间', key: 'createdAt', width: 20 },
        { header: '使用时间', key: 'usedAt', width: 20 },
      ];

      // 样式化表头
      worksheet.getRow(1).font = { bold: true, size: 12 };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // 添加数据
      codes.forEach((code) => {
        worksheet.addRow({
          code: code.code,
          status: code.isUsed ? '已使用' : '未使用',
          batchId: code.batchId,
          createdAt: new Date(code.createdAt).toLocaleString('zh-CN'),
          usedAt: code.usedAt ? new Date(code.usedAt).toLocaleString('zh-CN') : '-',
        });
      });

      // 自动筛选
      worksheet.autoFilter = {
        from: 'A1',
        to: 'E1',
      };

      // 设置响应头
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      
      // 使用URL编码处理中文文件名
      const filename = `兑换码_${batchId}_${codes.length}个_${new Date().toISOString().split('T')[0]}.xlsx`;
      const encodedFilename = encodeURIComponent(filename);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
      );

      // 写入响应
      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      console.error('Export batch codes error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // 导出所有兑换码到Excel（保留，以备将来使用）
  static async export(req: AuthRequest, res: Response) {
    try {
      // 获取所有兑换码
      const codes = await prisma.accessCode.findMany({
        orderBy: { createdAt: 'desc' },
      });

      // 创建工作簿
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('兑换码列表');

      // 设置列
      worksheet.columns = [
        { header: '兑换码', key: 'code', width: 20 },
        { header: '状态', key: 'status', width: 12 },
        { header: '批次ID', key: 'batchId', width: 25 },
        { header: '生成时间', key: 'createdAt', width: 20 },
        { header: '使用时间', key: 'usedAt', width: 20 },
      ];

      // 样式化表头
      worksheet.getRow(1).font = { bold: true, size: 12 };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // 添加数据
      codes.forEach((code) => {
        worksheet.addRow({
          code: code.code,
          status: code.isUsed ? '已使用' : '未使用',
          batchId: code.batchId,
          createdAt: new Date(code.createdAt).toLocaleString('zh-CN'),
          usedAt: code.usedAt ? new Date(code.usedAt).toLocaleString('zh-CN') : '-',
        });
      });

      // 自动筛选
      worksheet.autoFilter = {
        from: 'A1',
        to: 'E1',
      };

      // 设置响应头
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      
      // 使用URL编码处理中文文件名
      const filename = `所有兑换码_${codes.length}个_${new Date().toISOString().split('T')[0]}.xlsx`;
      const encodedFilename = encodeURIComponent(filename);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
      );

      // 写入响应
      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      console.error('Export all codes error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // 验证兑换码（公开接口）
  static async verify(req: any, res: Response) {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ success: false, error: '兑换码不能为空' });
      }

      const accessCode = await prisma.accessCode.findUnique({
        where: { code: code.trim().toUpperCase() },
      });

      if (!accessCode) {
        return res.json({ success: false, message: '兑换码不存在' });
      }

      if (accessCode.isUsed) {
        return res.json({ success: false, message: '兑换码已被使用' });
      }

      // 标记为已使用
      await prisma.accessCode.update({
        where: { code: code.trim().toUpperCase() },
        data: { 
          isUsed: true,
          usedAt: new Date(),
        },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Verify code error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
