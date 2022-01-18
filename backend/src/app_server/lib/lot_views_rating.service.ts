import Bs58 from '@/lib_common/bs58';
import { redisBase } from '@/lib_common/redis/base';

class LotViewsRatingService {
  private lotsViews = {} as { [lotId: string]: number };

  constructor() {
    const dumpInterval = 1000 * 60 * 5;

    setInterval(() => {
      this.dumpViewsDataToRedis();
    }, dumpInterval);
  }

  async lotView(lotId: string, authUserId: bigint) {
    if (!authUserId) {
      return;
    }

    const redis = redisBase.getClient();
    const keyL4U = `l4u:${lotId}:${authUserId.toString()}`;
    const userIdAndLot = await redis.exists(keyL4U);
    if (userIdAndLot) {
      return;
    }

    if (!this.lotsViews[lotId]) {
      this.lotsViews[lotId] = 0;
    }
    this.lotsViews[lotId]++;
    await redis.set(keyL4U, '1', ['EX', 600]);
  }

  async dumpViewsDataToRedis() {
    const lotsIds = Object.keys(this.lotsViews);
    if (lotsIds.length === 0) {
      return;
    }

    const redis = redisBase.getClient();
    const uuid = Bs58.uuid();
    await redis.set(`lots-views-dumps:${uuid}`, JSON.stringify(this.lotsViews));
    this.lotsViews = {};
  }
}

export const lotViewsRatingService = new LotViewsRatingService();
