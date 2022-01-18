import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from '@/lib_common/bcrypt';

export default async function (prisma: PrismaClient) {
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash: await bcrypt.generatePasswordHash('password'),
      role: UserRole.ADMIN,
      name: 'Admin Power',
      emailActivatedAt: new Date(),
    },
  });
}
