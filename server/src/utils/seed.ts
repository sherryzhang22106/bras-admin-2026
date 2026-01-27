import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('🌱 开始初始化数据库...');

  // 创建管理员账户
  const adminEmail = 'admin@bras.local';
  const adminPassword = 'bras123456';

  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'BRAS 管理员',
      },
    });
    console.log(`✅ 管理员账户已创建: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log('ℹ️  管理员账户已存在');
  }

  // 创建测试访问码
  const testCodes = ['BRAS-TEST001', 'BRAS-TEST002', 'BRAS-TEST003'];
  for (const code of testCodes) {
    try {
      await prisma.accessCode.create({
        data: {
          code,
          batchId: 'INITIAL_SEED',
        },
      });
      console.log(`✅ 访问码已创建: ${code}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`ℹ️  访问码已存在: ${code}`);
      }
    }
  }

  console.log('✅ 数据库初始化完成！');
  await prisma.$disconnect();
}

seed().catch((error) => {
  console.error('❌ 初始化失败:', error);
  process.exit(1);
});
