import * as dotenv from 'dotenv';
dotenv.config();
import env, { NodeRoleType } from '@/lib_common/env';
import '@/lib_db/models/index';
import '@/types';
import InitCron from '@/app_daemon/cron';
import { initWeb3 } from '@/lib_common/web3';
import * as fs from 'fs-extra';

async function initDirs() {
  await fs.mkdirs(env.DIR_TEMP_FILES);
  await fs.mkdirs(env.HOT_CACHE_DIR);
}

async function daemonStart() {
  console.log('env: ', env);

  InitCron();
  initDirs();
  initWeb3();
}

daemonStart();
