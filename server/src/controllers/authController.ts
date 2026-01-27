import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const admin = await prisma.admin.findUnique({
        where: { email },
      });

      if (!admin) {
        return res.status(401).json({ error: '邮箱或密码错误' });
      }

      const isValidPassword = await bcrypt.compare(password, admin.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: '邮箱或密码错误' });
      }

      const token = jwt.sign(
        { id: admin.id, email: admin.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.json({
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        },
        token,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(400).json({ error: error.message || 'Login failed' });
    }
  }
}
