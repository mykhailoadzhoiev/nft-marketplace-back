import prisma from '@/lib_db/prisma';
import { TokenOriginalStatus, TokenOriginalType } from '@prisma/client';
import axios, { AxiosResponse } from 'axios';
import * as _ from 'lodash';
import { Stream } from 'stream';
import { env } from 'process';
import { resolve } from 'path';
import * as fs from 'fs-extra';
import Bs58 from '@/lib_common/bs58';
import { createIpfsObjectFromFile } from '@/lib_ipfs/ipfs_oms';
import { putTokenMediaIpfsObject } from '@/lib_db/models/TokenMedia';

export type TaskOrgImportData = {
  tokenOriginalId: string;
  contentUrl: string;
};

export async function taskWorkOrgImport(taskData: TaskOrgImportData) {
  const tokenOriginalId = BigInt(taskData.tokenOriginalId);

  const tokenOriginal = await prisma.tokenOriginal.findFirst({
    where: {
      id: tokenOriginalId,
      type: TokenOriginalType.IMPORT,
      status: TokenOriginalStatus.IMPORT_TASK,
    },
  });

  if (!tokenOriginal) {
    throw new Error('original not found');
  }

  const res = (await axios({
    method: 'GET',
    url: taskData.contentUrl,
    responseType: 'stream',
  })) as AxiosResponse<Stream>;

  const tempFile = resolve(env.DIR_TEMP_FILES, Bs58.uuid());
  const ws = fs.createWriteStream(tempFile);
  res.data.pipe(ws);
  await new Promise((resolve, reject) => {
    ws.on('finish', () => {
      resolve(tempFile);
    });
    ws.on('error', reject);
  });

  const ipfsObjectRes = await createIpfsObjectFromFile(tempFile);
  if (ipfsObjectRes.isBad) {
    throw new Error(JSON.stringify(ipfsObjectRes.errData, null, 2));
  }
  const ipfsObject = ipfsObjectRes.data;
  await putTokenMediaIpfsObject(tokenOriginalId, ipfsObject, {
    isOriginal: true,
  });

  await prisma.tokenOriginal.update({
    where: {
      id: tokenOriginalId,
    },
    data: {
      contentType: ipfsObject.type,
      status: TokenOriginalStatus.VALIDATION,
    },
  });
}
