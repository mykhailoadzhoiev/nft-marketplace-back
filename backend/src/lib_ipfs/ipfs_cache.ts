import env, { NodeEnvType } from '@/lib_common/env';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as _ from 'lodash';
import * as IpfsStorage from './ipfs_storage';
import { IpfsObjectModel, getIpfsObjectById, getIpfsObjectBySha256Hash } from '@/lib_db/models/IpfsObject';
import { IpfsObject } from '.prisma/client';
import StandartResult from '@/lib_common/classes/standard_result';

let isInit = false;

const cacheData = {
  items: {} as { [sha256: string]: CacheItem },
  totalItems: 0,
  totalSize: 0,
  clearCacheIsActive: false,
  clearCacheResolves: [] as ((value: unknown) => void)[],
};

export interface CacheItemMeta {
  type: 'IMAGE' | 'VIDEO';
  sha256: string;
  mime: string;
  size: number;
  width: number;
  height: number;
  mtime: Date;
  thumbs?: { [thumbName: string]: string };
}

export class CacheItem {
  pathFile: string;
  pathMeta: string;
  meta: CacheItemMeta;

  // processes
  processes = 0;

  // stats
  head = 0; // head count
  get = 0; // get requests count

  constructor(pathFile: string, pathMeta: string, meta: CacheItemMeta) {
    this.pathFile = pathFile;
    this.pathMeta = pathMeta;
    this.meta = meta;
  }

  getHeaders() {
    return {
      'Cache-Control': 'public, immutable',
      'Content-Type': this.meta.mime,
      'Content-Length': this.meta.size,
      'Last-Modified': new Date(this.meta.mtime).toUTCString(),
      ETag: this.meta.sha256,
    };
  }

  createReadStream() {
    const rs = fs.createReadStream(this.pathFile);
    return rs;
  }

  statsEmitHead() {
    this.head++;
    this.processEnd();
  }

  statsEmitGet() {
    this.get++;
    this.processEnd();
    clearCachePass();
  }

  processStart() {
    this.processes += 1;
    // console.log('processStart', this.processes, this.meta.sha256);
  }

  processEnd() {
    this.processes -= 1;
    // console.log('processEnd', this.processes, this.meta.sha256);
  }
}

export async function init() {
  if (isInit) {
    false;
  }

  await scanItems();

  isInit = true;
}

async function scanItems() {
  async function scanDir(dir) {
    const files = await fs.readdir(dir);
    for (let file of files) {
      const cacheItemPathToFile = path.resolve(dir, file);
      const lstat = await fs.lstat(cacheItemPathToFile);

      if (lstat.isDirectory()) {
        await scanDir(path.resolve(dir, file));
      } else if (lstat.isFile()) {
        const cacheItemPathToMeta = path.resolve(dir, file + '.json');

        if (!_.endsWith(file, '.json')) {
          await putCacheItemFromFiles(cacheItemPathToFile, cacheItemPathToMeta);
        }
      }
    }
  }

  await scanDir(env.HOT_CACHE_DIR);
}

function getCacheItemPaths(sha256: string) {
  const suffix = sha256.substr(0, env.HOT_CACHE_DIR_SUFFIX_LENGTH);
  const cacheItemPathToFile = path.resolve(env.HOT_CACHE_DIR, suffix, sha256);
  const cacheItemPathToMeta = cacheItemPathToFile + '.json';
  return [cacheItemPathToFile, cacheItemPathToMeta];
}

function putCacheObject(sha256: string, pathToFile: string, pathToMeta: string, metaData: CacheItemMeta) {
  const cacheItem = new CacheItem(pathToFile, pathToMeta, metaData);
  cacheData.items[sha256] = cacheItem;
  cacheData.totalItems++;
  cacheData.totalSize += cacheItem.meta.size;
  return cacheData.items[sha256];
}

export async function deleteCacheItem(sha256: string): Promise<boolean> {
  const cacheItem = cacheData.items[sha256];

  if (cacheItem) {
    await fs.remove(cacheItem.pathFile);
    await fs.remove(cacheItem.pathMeta);

    cacheData.totalItems--;
    cacheData.totalSize -= cacheItem.meta.size;
    delete cacheData.items[sha256];

    return true;
  }

  return false;
}

async function checkPrevDir(pathToFile: string) {
  const prevDirPath = pathToFile.replace(/^(.*)\/\w*$/, '$1');
  await fs.mkdirs(prevDirPath);
}

export function existsCacheItemBySha256(sha256: string) {
  return !!cacheData.items[sha256];
}

async function waitClearCacheComplete() {
  if (cacheData.clearCacheIsActive) {
    return new Promise((resolve) => {
      cacheData.clearCacheResolves.push(resolve);
    });
  }
}

export async function getCacheItemBySha256(sha256: string): Promise<CacheItem | null> {
  await waitClearCacheComplete();

  let cacheItem = cacheData.items[sha256];

  if (cacheItem) {
    return cacheItem;
  }

  const [cacheItemPathToFile, cacheItemPathToMeta] = getCacheItemPaths(sha256);
  cacheItem = await putCacheItemFromFiles(cacheItemPathToFile, cacheItemPathToMeta);

  return cacheItem;
}

export function getCacheItemBySha256Force(sha256: string): CacheItem | null {
  let cacheItem = cacheData.items[sha256];

  if (cacheItem) {
    return cacheItem;
  }

  return null;
}

export async function updateMetaFileBySha256(sha256: string) {
  const getIpfsObjectRes = await getIpfsObjectBySha256Hash(sha256);
  if (getIpfsObjectRes.isBad) {
    return false;
  }
  const ipfsObjectModel = IpfsObjectModel.wrap(getIpfsObjectRes.data);
  await putMetaDataByIpfsObjectModelAndReturnMetaData(ipfsObjectModel);
  return true;
}

async function putCacheItemFromFiles(
  cacheItemPathToFile: string,
  cacheItemPathToMeta: string,
): Promise<CacheItem | null> {
  try {
    const metaExists = await fs.stat(cacheItemPathToMeta);

    if (!metaExists || !metaExists.isFile) {
      await fs.remove(cacheItemPathToFile);
      return null;
    }

    const sha256 = cacheItemPathToFile.replace(/^.*\/(.*)$/, '$1');
    const stat = await fs.stat(cacheItemPathToFile);

    const metaData = (await fs.readJSON(cacheItemPathToMeta)) as CacheItemMeta;
    if (metaData.size !== stat.size) {
      await fs.remove(cacheItemPathToFile);
      await fs.remove(cacheItemPathToMeta);
      return null;
    }

    return putCacheObject(sha256, cacheItemPathToFile, cacheItemPathToMeta, metaData);
  } catch (error) {
    return null;
  }
}

export async function loadCacheItemByIpfsObject(ipfsObject: IpfsObject) {
  const stdRes = new StandartResult<CacheItem>();

  const ipfsObjectModel = IpfsObjectModel.wrap(ipfsObject);
  const sha256 = ipfsObjectModel.model.sha256;
  const [cacheItemPathToFile, cacheItemPathToMeta] = getCacheItemPaths(sha256);

  await checkPrevDir(cacheItemPathToFile);

  const downloadObjectRes = await IpfsStorage.objectDownloadToFile(sha256, cacheItemPathToFile);
  if (downloadObjectRes.isBad) {
    return stdRes.mergeBad(downloadObjectRes);
  }

  const metaData = await putMetaDataByIpfsObjectModelAndReturnMetaData(ipfsObjectModel);

  const cacheItem = putCacheObject(sha256, cacheItemPathToFile, cacheItemPathToMeta, metaData);
  return stdRes.setData(cacheItem);
}

async function putMetaDataByIpfsObjectModelAndReturnMetaData(ipfsObjectModel: IpfsObjectModel) {
  const [cacheItemPathToFile, cacheItemPathToMeta] = getCacheItemPaths(ipfsObjectModel.model.sha256);

  const metaData = {
    type: ipfsObjectModel.model.type,
    sha256: ipfsObjectModel.model.sha256,
    size: ipfsObjectModel.model.size,
    width: ipfsObjectModel.model.width,
    height: ipfsObjectModel.model.height,
    mime: ipfsObjectModel.model.mime,
    mtime: ipfsObjectModel.model.updatedAt,
  } as CacheItemMeta;

  if (ipfsObjectModel.model.type === 'IMAGE' && !ipfsObjectModel.model.isThumb) {
    const thumbs = {} as { [thumbName: string]: string };

    const ipfsObjectThumbs = await ipfsObjectModel.getThumbs();
    for (const ipfsObjectThumb of ipfsObjectThumbs) {
      const thumbIpfsObject = await getIpfsObjectById(ipfsObjectThumb.thumbIpfsObjectId);
      if (!thumbIpfsObject) {
        console.error('no ipfs item for thumb');
        continue;
      }
      thumbs[ipfsObjectThumb.thumbName + ''] = thumbIpfsObject.sha256;
    }

    metaData.thumbs = thumbs;
  }

  try {
    await fs.writeJSON(cacheItemPathToMeta, metaData);
  } catch (error) {
    console.error(new Error('no access to meta file!!!'));
  }

  return metaData;
}

async function clearCache() {
  if (cacheData.clearCacheIsActive) {
    return;
  }

  cacheData.clearCacheIsActive = true;
  const timeStart = Date.now();

  try {
    const result = {
      processTime: 0,
      itemsCleared: [],
      preClearCacheStats: {
        totalItems: cacheData.totalItems,
        totalSize: cacheData.totalSize,
      },
      afterClearCacheStats: {
        totalItems: 0,
        totalSize: 0,
      },
    };

    let tempCacheItems = _.clone(cacheData.items);
    let tempTotalItems = cacheData.totalItems;
    let tempTotalSize = cacheData.totalSize;
    let itemsToClear = [];

    while (tempTotalItems > env.HOT_CACHE_MAX_ITEMS || tempTotalSize > env.HOT_CACHE_MAX_SIZE) {
      let itemToClearSha256 = null as null | string;
      let itemToClearSize = 0;
      let itemSizeEfficiency = Number.POSITIVE_INFINITY;

      for (const cacheItemKey in tempCacheItems) {
        const cacheItem = tempCacheItems[cacheItemKey];

        if (cacheItem.processes > 0) {
          continue;
        }

        const requests = cacheItem.head + cacheItem.get;
        const size = cacheItem.meta.size;
        const sizeEfficiency = requests * size;

        if (sizeEfficiency < itemSizeEfficiency) {
          itemSizeEfficiency = sizeEfficiency;
          itemToClearSha256 = cacheItemKey;
          itemToClearSize = size;
        }
      }

      if (itemToClearSha256) {
        itemsToClear.push(itemToClearSha256);
        tempTotalItems--;
        tempTotalSize -= itemToClearSize;
        delete tempCacheItems[itemToClearSha256];
      }
    }

    for (const itemToClearSha256 of itemsToClear) {
      await deleteCacheItem(itemToClearSha256);
      result.itemsCleared.push(itemToClearSha256);
    }

    result.afterClearCacheStats = {
      totalItems: cacheData.totalItems,
      totalSize: cacheData.totalSize,
    };
    result.processTime = Date.now() - timeStart;
    cacheData.clearCacheIsActive = false;

    while (cacheData.clearCacheResolves.length) {
      let resolve = cacheData.clearCacheResolves.splice(0, 1);
      if (resolve.length) {
        resolve[0](1);
      }
    }

    if (env.NODE_ENV === NodeEnvType.development) {
      console.log('clear cache result', result);
    }

    return result;
  } catch (error) {
    cacheData.clearCacheIsActive = false;
    throw error;
  }
}

function clearCachePass() {
  if (
    !cacheData.clearCacheIsActive &&
    (cacheData.totalItems > env.HOT_CACHE_MAX_ITEMS || cacheData.totalSize > env.HOT_CACHE_MAX_SIZE)
  ) {
    void clearCache();
  }
}

export function dumpCacheItemsStats() {
  for (const cacheItemKey in cacheData.items) {
    const cacheItem = cacheData.items[cacheItemKey];
    cacheItem.head = Math.floor(cacheItem.head / 2);
    cacheItem.get = Math.floor(cacheItem.get / 2);
  }
}
