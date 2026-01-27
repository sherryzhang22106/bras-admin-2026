import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 删除旧的管理员（如果存在）
  await prisma.admin.deleteMany({
    where: { email: 'admin@bras.local' },
  });

  // 创建管理员
  const admin = await prisma.admin.create({
    data: {
      email: 'admin@bras.local',
      password: '$2a$10$cZd0K57cSOi4LBiQY1WPyukV/fcYVR4dZLR7gIU7q6HEWE.E/HuEm',
      name: 'Admin',
    },
  });

  console.log('✅ 管理员账户已创建：');
  console.log('   邮箱:', admin.email);
  console.log('   密码: bras123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
