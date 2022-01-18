import { Prisma, PrismaClient } from '.prisma/client';
import prisma from '@/lib_db/prisma';

export default async function (argv: { _: string[] }) {
  let x = new Prisma.Decimal('1000000000000000000000000000000');

  console.log(x.toString());
  console.log(x.toSD());
  console.log(x.toFixed());

  process.exit(0);
}
