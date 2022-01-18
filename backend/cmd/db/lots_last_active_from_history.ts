import { PrismaClient, Lot, TokenHistory } from '@prisma/client';

export default async function (argv) {
  const prisma = new PrismaClient();

  let lastLotId: bigint;
  let lots: (Lot & {
    TokenHistories: TokenHistory[];
  })[];
  async function getNextLots() {
    const allLots = await prisma.lot.findMany({
      where: (() => {
        if (lastLotId) {
          return {
            id: {
              gt: lastLotId,
            },
          };
        } else {
          return undefined;
        }
      })(),
      take: 100,
      orderBy: {
        id: 'asc',
      },
      include: {
        TokenHistories: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    return allLots;
  }

  lots = await getNextLots();
  while (lots.length > 0) {
    for (const lot of lots) {
      if (lot.TokenHistories[0]) {
        const lastActiveAt = lot.TokenHistories[0].createdAt;

        await prisma.lot.update({
          where: {
            id: lot.id,
          },
          data: {
            lastActiveAt: lot.TokenHistories[0].createdAt,
          },
        });

        console.log(`lot #${lot.id.toString()}, set lastActiveAt ${lastActiveAt.toISOString()}`);
      }
    }

    lastLotId = lots[lots.length - 1].id;
    lots = await getNextLots();
  }

  prisma.$disconnect();
}
