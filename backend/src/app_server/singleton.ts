import { PrismaClient } from '@prisma/client';
import { appInit } from '@/app_server/app';

beforeAll(async () => {
  await appInit();
});
