/*
  IPFS OBJECTES MANEGER SYSTEM
*/

import * as IpfsObjectModelStuff from '@/lib_db/models/IpfsObject';
import * as IpfsCache from './ipfs_cache';
import * as IpfsStorage from './ipfs_storage';
import env from '@/lib_common/env';
import { getFileSha256 } from '@/lib_common/utils';
import * as utils from '@/lib_common/utils';
import { IpfsObject, MediaType } from '@prisma/client';
import StandartResult from '@/lib_common/classes/standard_result';
import prisma from '@/lib_db/prisma';
import Bs58 from '@/lib_common/bs58';
import IpfsRequest, { ThumbParam } from '@/lib_common/classes/ipfs_request';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as sharp from 'sharp';

export async function getIpfsCacheItemByIpfsRequest(ipfsRequest: IpfsRequest) {
  const res = await getCacheItem(ipfsRequest);
  return res;
}

export async function getCacheItemBySha256(sha256: string) {
  const stdRes = new StandartResult<IpfsCache.CacheItem>();

  const orgCacheItem = await IpfsCache.getCacheItemBySha256(sha256);

  if (orgCacheItem) {
    stdRes.setData(orgCacheItem);
  } else {
    const getIpfsObjectRes = await IpfsObjectModelStuff.getIpfsObjectBySha256Hash(sha256);
    if (getIpfsObjectRes.isBad) {
      return stdRes.mergeBad(getIpfsObjectRes);
    }

    const loadCacheItemRes = await IpfsCache.loadCacheItemByIpfsObject(getIpfsObjectRes.data);
    if (loadCacheItemRes.isBad) {
      return stdRes.mergeBad(loadCacheItemRes);
    }

    stdRes.mergeGood(loadCacheItemRes);
  }

  stdRes.data.processStart();

  return stdRes;
}

async function getCacheItem(ipfsRequest: IpfsRequest): Promise<StandartResult<IpfsCache.CacheItem>> {
  let cacheItem = null as IpfsCache.CacheItem | null;
  const stdRes = new StandartResult<IpfsCache.CacheItem>();
  const sha256 = ipfsRequest.sha256;

  const getCacheItemRes = await getCacheItemBySha256(sha256);
  if (getCacheItemRes.isBad) {
    return stdRes.mergeBad(getCacheItemRes);
  }
  cacheItem = getCacheItemRes.data;

  if (ipfsRequest.type) {
    if (ipfsRequest.type === 'image' && cacheItem.meta.type !== 'IMAGE') {
      return stdRes.setCode(404).setErrData('not found');
    } else if (ipfsRequest.type === 'video' && cacheItem.meta.type !== 'VIDEO') {
      return stdRes.setCode(404).setErrData('not found');
    }
  }

  if (ipfsRequest.thumb && cacheItem.meta.thumbs) {
    if (cacheItem.meta.type !== 'IMAGE') {
      cacheItem.processEnd();
      return stdRes.setCode(406).setErrData('thumbs size param for not thumbs allow object');
    }

    const thumb = ipfsRequest.thumb;
    if (thumb.type === 'width') {
      thumb.name = IpfsRequest.parseThumbSize(
        parseInt(thumb.name),
        cacheItem.meta.width,
        env.HOT_CACHE_MIN_THUMB_LOG_SIZE,
      );
    } else if (thumb.type === 'name') {
      if (thumb.name === 'fullhd') {
        if (cacheItem.meta.width >= 1920 || cacheItem.meta.height >= 1920) {
          // noting
        } else {
          return stdRes.setData(cacheItem);
        }
      }
    }

    cacheItem.processEnd();
    let thumbSha256 = cacheItem.meta.thumbs[thumb.name];

    if (thumbSha256) {
      const getThubCacheItemRes = await getCacheItemBySha256(thumbSha256);
      if (getThubCacheItemRes.isGood) {
        return stdRes.mergeGood(getThubCacheItemRes);
      }
    }

    const createNewThumbRes = await createNewThumbForCacheItem(cacheItem, thumb);
    if (createNewThumbRes.isBad) {
      return stdRes.mergeBad(createNewThumbRes);
    }

    return stdRes.mergeGood(createNewThumbRes);
  }

  stdRes.setData(cacheItem);

  return stdRes;
}

export function getContentTypeByMime(mime: string) {
  let contentType: MediaType;
  if (_.startsWith(mime, 'image/')) {
    contentType = MediaType.IMAGE;
  } else if (_.startsWith(mime, 'video/')) {
    contentType = MediaType.VIDEO;
  } else if (_.startsWith(mime, 'audio/')) {
    contentType = MediaType.AUDIO;
  } else {
    throw new Error('Bad mime!');
  }
  return contentType;
}

export async function createIpfsObjectFromFile(
  filePath: string,
  params?: {
    thumbData?: {
      orgIpfsId: bigint;
      name: string;
    };
    noValidation?: boolean;
  },
) {
  const stdRes = new StandartResult<IpfsObject>(201);
  const fileSha256Hash = await getFileSha256(filePath);

  const getIpfsObjRes = await IpfsObjectModelStuff.getIpfsObjectBySha256Hash(fileSha256Hash);
  if (getIpfsObjRes.isGood) {
    await fs.remove(filePath);
    return stdRes.setCode(208).setData(getIpfsObjRes.data);
  }

  const fileInfo = await utils.getFileInfo(filePath);
  const mime = fileInfo.mime;
  const contentType = getContentTypeByMime(mime);
  const fstat = await fs.stat(filePath);

  let size,
    width = 0,
    height = 0,
    duration = null,
    frameRate = 0;
  if (contentType === MediaType.IMAGE) {
    const imageInfo = await sharp(filePath).metadata();
    size = fstat.size;
    width = imageInfo.width;
    height = imageInfo.height;
  } else if (contentType === MediaType.VIDEO) {
    const fileProbe = await utils.getMediaContentProbe(filePath);
    const stream = fileProbe.videoStreams[0];

    size = fileProbe.format.size;
    width = stream.width;
    height = stream.height;
    duration = parseFloat(stream.duration);
    frameRate = parseFloat(stream.r_frame_rate);
  } else if (contentType === MediaType.AUDIO) {
    const fileProbe = await utils.getMediaContentProbe(filePath);
    const stream = fileProbe.audioStreams[0];

    size = fileProbe.format.size;
    duration = parseFloat(stream.duration);
  }

  if (!params || !params.noValidation) {
    const errors = [];
    const allowMimeType = env.getLotContentMimeType(contentType);

    if (allowMimeType.indexOf(mime) === -1) {
      errors.push('bad_bad_mime');
    }

    if (contentType !== MediaType.AUDIO) {
      const minWidth = env.getLotContentMinWidth(contentType);
      const minHeight = env.getLotContentMinHeight(contentType);

      if (width < minWidth || height < minHeight) {
        errors.push('bad_ContentWidthOrHeight');
      }
    }

    if (duration && contentType === MediaType.VIDEO && duration > env.LOT_MAKE_VIDEO_MAX_DURATION_SEC) {
      errors.push('bad_Duration');
    }

    if (contentType === MediaType.VIDEO && frameRate < env.LOT_MAKE_VIDEO_MIN_FRAME_RATE) {
      errors.push('bad_FrameRate');
    }

    if (duration && contentType === MediaType.AUDIO && duration > env.LOT_MAKE_AUDIO_MAX_DURATION_SEC) {
      errors.push('bad_Duration');
    }

    if (errors.length > 0) {
      await fs.remove(filePath);
      return stdRes.setCode(422).setErrData({
        fields: {
          file: errors,
        },
      });
    }
  }

  const objectUploadRes = await IpfsStorage.objectUpload(filePath, fileSha256Hash);
  if (objectUploadRes.isBad) {
    return stdRes.mergeBad(objectUploadRes);
  }

  await fs.remove(filePath);

  let ipfsObject: IpfsObject;
  if (params && params.thumbData) {
    if (contentType !== MediaType.IMAGE) {
      return stdRes.setCode(500).setErrData('bad org content type for create thumb');
    }

    const thumbIpfsObject = await prisma.ipfsObject.create({
      data: {
        sha256: fileSha256Hash,
        mime,
        size,
        width,
        height,
        type: contentType,
        isThumb: true,
      },
    });

    await prisma.ipfsObjectThumb.create({
      data: {
        orgIpfsObjectId: params.thumbData.orgIpfsId,
        thumbIpfsObjectId: thumbIpfsObject.id,
        thumbName: params.thumbData.name,
      },
    });

    ipfsObject = thumbIpfsObject;
  } else {
    ipfsObject = await prisma.ipfsObject.create({
      data: {
        sha256: fileSha256Hash,
        mime,
        size,
        width,
        height,
        type: contentType,
      },
    });
  }

  stdRes.setData(ipfsObject);
  return stdRes;
}

async function createNewThumbForCacheItem(
  orgCacheItem: IpfsCache.CacheItem,
  thumb: ThumbParam,
): Promise<StandartResult<IpfsCache.CacheItem>> {
  const stdRes = new StandartResult<IpfsCache.CacheItem>(201);

  const orgSha256 = orgCacheItem.meta.sha256;
  const getOrgIpfsObjectRes = await IpfsObjectModelStuff.getIpfsObjectBySha256Hash(orgSha256);
  if (getOrgIpfsObjectRes.isBad) {
    return stdRes.setCode(404).setErrData('');
  }

  const tempNewThumbImageFile = path.resolve(env.DIR_TEMP_FILES, Bs58.uuid() + '.thumb.jpg');
  let image = sharp(orgCacheItem.pathFile);
  const metadata = await image.metadata();

  if (thumb.type === 'width') {
    await image.resize(parseInt(thumb.name)).jpeg({ quality: 50 }).toFile(tempNewThumbImageFile);
  } else if (thumb.type === 'name') {
    if (thumb.name === 'fullhd') {
      if (metadata.height > metadata.width) {
        await image.resize({ height: 1920 }).jpeg({ quality: 50 }).toFile(tempNewThumbImageFile);
      } else {
        await image.resize({ width: 1920 }).jpeg({ quality: 50 }).toFile(tempNewThumbImageFile);
      }
    }
  }

  const createThumbIpfsObjectRes = await createIpfsObjectFromFile(tempNewThumbImageFile, {
    thumbData: {
      orgIpfsId: getOrgIpfsObjectRes.data.id,
      name: thumb.name,
    },
    noValidation: true,
  });
  if (createThumbIpfsObjectRes.isBad) {
    return stdRes.mergeBad(createThumbIpfsObjectRes);
  }

  await fs.remove(tempNewThumbImageFile);

  orgCacheItem.meta.thumbs[thumb.name] = createThumbIpfsObjectRes.data.sha256;

  await IpfsCache.updateMetaFileBySha256(orgSha256);

  const getNewThumbCacheItem = await getCacheItemBySha256(createThumbIpfsObjectRes.data.sha256);
  if (getNewThumbCacheItem.isBad) {
    return stdRes.mergeBad(getNewThumbCacheItem);
  }

  stdRes.mergeGood(getNewThumbCacheItem);

  return stdRes;
}
