import { Prisma, PrismaClient } from '.prisma/client';
import prisma from '@/lib_db/prisma';
import { TokenHistoryType } from '@prisma/client';
import * as moment from 'moment';

export default async function (argv: { _: string[] }) {
  let betAmountDesimal = new Prisma.Decimal('64000000000000000000');
  const userId = BigInt(1);
  const lotId = BigInt(1);
  const pureSignsData = 'sdfsdfsd';

  const newCurrentCost = betAmountDesimal.mul(1.05).floor();

  console.log('betAmountDesimal', betAmountDesimal);
  console.log('newCurrentCost', newCurrentCost);

  const [newBet, updatedLot] = await prisma.$transaction([
    prisma.lotBet.create({
      data: {
        userId: userId,
        lotId: lotId,
        betAmount: betAmountDesimal.toFixed(),
        buyerSignsData: pureSignsData,
      },
    }),
    prisma.lot.update({
      where: {
        id: lotId,
      },
      data: {
        currentCost: newCurrentCost.toFixed(),
        lastActiveAt: moment().toISOString(),
      },
    }),
  ]);

  await prisma.lotBet.update({
    where: {
      id: newBet.id,
    },
    data: {
      betAmount: {
        increment: newCurrentCost.toFixed(),
      },
    },
  });

  await prisma.tokenHistory.create({
    data: {
      type: TokenHistoryType.LOT_BET_CREATED,
      tokenOriginalId: lotId,
      userId: userId,
      lotId: lotId,
      betId: newBet.id,
    },
  });

  process.exit(0);
}
