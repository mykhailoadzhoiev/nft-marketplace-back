import * as dotenv from 'dotenv';
dotenv.config();
import env from '@/lib_common/env';
import '@/lib_db/models/index';
import '@/types';
import app, { appInit } from '@/app_server/app';
import InitCron from '@/app_server/cron';

async function serverStart() {
  console.log('env: ', env);

  InitCron();

  await appInit();

  // Serve the application at the given port
  app.listen(env.NODE_PORT, () => {
    // Success callback
    console.log(`Listening at http://localhost:${env.NODE_PORT}/`);
  });
}

serverStart();
