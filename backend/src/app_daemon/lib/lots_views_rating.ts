import prisma from '@/lib_db/prisma';
import { redisBase } from '@/lib_common/redis/base';

export async function lotsViewsCounter() {
  const redis = redisBase.getClient();
  const dumpsKeys = await redis.keys('lots-views-dumps:*');
  const allLotsViewsData = {} as { [lotId: string]: number };

  for (const dumpKey of dumpsKeys) {
    const lotsViewsDump = await redis.get(dumpKey);
    const lotsViewsData = JSON.parse(lotsViewsDump) as { [lotId: string]: number };
    const lotsIds = Object.keys(lotsViewsData);

    for (const lotId of lotsIds) {
      if (!allLotsViewsData[lotId]) {
        allLotsViewsData[lotId] = 0;
      }
      allLotsViewsData[lotId] += lotsViewsData[lotId];
    }

    await redis.del(dumpKey);
  }

  const lotsIds = Object.keys(allLotsViewsData);
  for (const lotId of lotsIds) {
    await prisma.lot.update({
      where: {
        id: BigInt(lotId),
      },
      data: {
        viewsRating: {
          increment: allLotsViewsData[lotId],
        },
      },
    });
  }
}

export async function lotsViewsRatingDeflation() {
  const lots = await prisma.lot.findMany({
    where: {
      viewsRating: {
        gt: 0,
      },
    },
  });

  for (const lot of lots) {
    const viewsRating = Math.floor(lot.viewsRating * 0.9);
    await prisma.lot.update({
      where: {
        id: lot.id,
      },
      data: {
        viewsRating,
      },
    });
  }
}
