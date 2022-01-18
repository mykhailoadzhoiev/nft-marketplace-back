import { Request, Response } from 'express';
import * as cp from 'child_process';
import * as os from 'os';
import prisma from '@/lib_db/prisma';
export interface SystemInfo {
  ipfsObjectsCount: number;

  diskTotal: string;
  diskUsage: string;

  ramTotal: string;
  ramUsage: string;
  ramFree: string;
}

async function getDiscInfo(mountedon): Promise<{
  usedSize: number;
  totalSize: number;
}> {
  return new Promise((resolve, reject) => {
    let ps = cp.spawn('df', ['-BK', mountedon]);
    let _ret = '';

    ps.stdout.on('data', function (data) {
      _ret = data.toString();
    });

    ps.on('error', function (err) {
      reject(err);
    });

    ps.on('close', function () {
      let storageDeviceInfo;
      if (_ret.split('\n')[1]) {
        let arr = _ret.split('\n')[1].split(/[\s,]+/);
        storageDeviceInfo = {};
        storageDeviceInfo.usedSize = parseInt(arr[2].replace('K', '')) * 1024; // exp "300K" => 300
        storageDeviceInfo.totalSize = parseInt(arr[3].replace('K', '')) * 1024 + storageDeviceInfo.usedSize;
      }
      resolve(storageDeviceInfo);
    });
  });
}

export async function getSystemInfo(req: Request, res: Response) {
  const ipfsObjectsCount = await prisma.ipfsObject.count();

  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const usageMem = totalMem - freeMem;

  const sizeRoot = await getDiscInfo('/');

  const result = {
    ipfsObjectsCount: ipfsObjectsCount,

    diskTotal: (sizeRoot.totalSize / 1024 / 1024 / 1024).toFixed(2) + ' GB',
    diskUsage: (sizeRoot.usedSize / 1024 / 1024 / 1024).toFixed(2) + ' GB',

    ramTotal: (totalMem / 1024 / 1024).toFixed(2) + ' MB',
    ramUsage: (usageMem / 1024 / 1024).toFixed(2) + ' MB',
    ramFree: (freeMem / 1024 / 1024).toFixed(2) + ' MB',
  } as SystemInfo;

  res.json(result);
}
