import { Prisma, PrismaClient } from '.prisma/client';
import prisma from '@/lib_db/prisma';
import { TokenHistoryType } from '@prisma/client';
import * as moment from 'moment';

export default async function (argv: { _: string[] }) {
  const price = new Prisma.Decimal('528908503015004700');
  const bet = new Prisma.Decimal('414413651779918000');

  const r = bet.lt(price);

  console.log(r);

  process.exit(0);
}
