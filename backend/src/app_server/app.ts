import * as express from 'express';
import AppRouter from '@/app_server/routes/index';
import env, { NodeEnvType } from '@/lib_common/env';
import { redisBase } from '@/lib_common/redis/base';
import * as fs from 'fs-extra';
import * as IpfsStorage from '@/lib_ipfs/ipfs_storage';
import * as IpfsCache from '@/lib_ipfs/ipfs_cache';
import { initWeb3 } from '@/lib_common/web3';

const app = express();

app.use(AppRouter);

export default app;

async function initDirs() {
  await fs.mkdirs(env.DIR_TEMP_FILES);
  await fs.mkdirs(env.HOT_CACHE_DIR);
}

export async function appInit() {
  const redisClient = redisBase.getClient();

  await initDirs();
  await IpfsStorage.init();
  await IpfsCache.init();
  await initWeb3();

  if (env.NODE_ENV === NodeEnvType.development) {
    const keys = await redisClient.keys('*');
    for (let key of keys) {
      await redisClient.del(key);
    }
  }
}
