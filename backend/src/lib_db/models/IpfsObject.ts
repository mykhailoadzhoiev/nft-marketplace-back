import prisma from '@/lib_db/prisma';
import { IpfsObject, IpfsObjectLocation } from '@prisma/client';
import StandartResult from '@/lib_common/classes/standard_result';
import * as _ from 'lodash';
import { redisBase } from '@/lib_common/redis/base';

export async function getIpfsObjectById(id: bigint) {
  const ipfsObject = await prisma.ipfsObject.findFirst({
    where: {
      id,
    },
  });
  return ipfsObject || null;
}

export async function getIpfsObjectBySha256Hash(sha256: string) {
  const res = new StandartResult<IpfsObject>();

  const ipfsObject = await prisma.ipfsObject.findFirst({
    where: {
      sha256,
    },
  });

  if (!ipfsObject) {
    return res.setCode(404);
  }

  return res.setData(ipfsObject);
}

export class IpfsObjectModel {
  model: IpfsObject;

  constructor(model: IpfsObject) {
    this.model = model;
  }

  static wrap(model: IpfsObject) {
    return new IpfsObjectModel(model);
  }

  async getThumbs() {
    const ipfsObjectThumbs = await prisma.ipfsObjectThumb.findMany({
      where: {
        orgIpfsObjectId: this.model.id,
      },
    });
    return ipfsObjectThumbs;
  }

  static async getSha256ById(id: bigint) {
    const redis = redisBase.getClient();
    const cacheKey = `cache:ipfs_object_id_for_sha256:${id.toString()}`;
    const cacheData = await redis.get(cacheKey);
    if (cacheData) {
      return cacheData;
    }

    const ipfsObject = await prisma.ipfsObject.findFirst({
      where: {
        id,
      },
    });
    if (ipfsObject) {
      const sha256 = ipfsObject.sha256;
      await redis.set(cacheKey, sha256, ['EX', 3600]);
      return sha256;
    }

    return null;
  }
}
