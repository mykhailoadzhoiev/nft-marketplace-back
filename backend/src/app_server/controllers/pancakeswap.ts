import { Request, Response } from 'express';
import { redisBase } from '@/lib_common/redis/base';
import axios from 'axios';
import env from '@/lib_common/env';

const PancakeswapCacheKey = 'cache:pancakeswap';

export async function getPancakeswapData(req: Request, res: Response) {
  const redis = redisBase.getClient();

  const cacheDataRaw = await redis.get(PancakeswapCacheKey);
  if (cacheDataRaw) {
    const cacheData = JSON.parse(cacheDataRaw);
    res.json(cacheData);
    return;
  }

  const url =
    `https://api.pancakeswap.info/api/v2/tokens/${env.SYS_PANCAKESWAP_TOKEN}`;
  const { data } = await axios.get(url); 
  redis.set(PancakeswapCacheKey, JSON.stringify(data), ['EX', 3600])
  res.json(data);
}
