import { putTokenMediaIpfsObject, MediaFlags, TokenMediaView } from 'src/lib_db/models/TokenMedia';
import { TokenOriginalView } from 'src/lib_db/models/TokenOriginal';
import { createIpfsObjectFromFile, getCacheItemBySha256 } from '@/lib_ipfs/ipfs_oms';
import { CacheItem } from '@/lib_ipfs/ipfs_cache';
import Bs58 from '@/lib_common/bs58';
import env from '@/lib_common/env';
import { resolve } from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import * as utils from '@/lib_common/utils';

async function cutVideoProcessingForCacheItem(cacheItem: CacheItem) {
  const tempFile = resolve(env.DIR_TEMP_FILES, Bs58.uuid() + '.mp4');
  const sourcePath = cacheItem.pathFile;

  const fileInfo = await utils.getMediaContentProbe(sourcePath);
  const duration = parseFloat(fileInfo.videoStreams[0].duration);
  const targetDuration = duration * 0.1;

  await new Promise((resolve, reject) => {
    ffmpeg({ source: sourcePath })
      .setStartTime(0)
      .setDuration(targetDuration)
      .videoCodec('libx264')
      .addOptions(['-profile:v main', '-movflags +faststart', '-vf format=yuv420p', '-c:a aac'])
      .on('start', (commandLine) => {
        // console.log(commandLine);
      })
      .on('error', (err) => {
        console.error('err', err);
      })
      .on('end', (err) => {
        if (err) {
          return reject(err);
        }
        resolve(1);
      })
      .saveToFile(tempFile);
  });

  return tempFile;
}

async function convertVideoProcessingForCacheItem(cacheItem: CacheItem) {
  const tempFile = resolve(env.DIR_TEMP_FILES, Bs58.uuid() + '.mp4');
  const sourcePath = cacheItem.pathFile;

  const fileInfo = await utils.getMediaContentProbe(sourcePath);
  const duration = parseFloat(fileInfo.videoStreams[0].duration);

  await new Promise((resolve, reject) => {
    ffmpeg({ source: sourcePath })
      .setStartTime(0)
      .videoCodec('libx264')
      .addOptions(['-profile:v main', '-movflags +faststart', '-vf format=yuv420p', '-c:a aac'])
      .on('start', (commandLine) => {
        // console.log(commandLine);
      })
      .on('error', (err) => {
        console.error('err', err);
      })
      .on('end', (err) => {
        if (err) {
          return reject(err);
        }
        resolve(1);
      })
      .saveToFile(tempFile);
  });

  return tempFile;
}

async function videoProcessingForContent(
  content: TokenMediaView,
  tokenOriginalId: bigint,
  type: 'cut' | 'convert',
  mediaFlags: MediaFlags,
) {
  if (!content) {
    throw new Error('no content');
  }

  const getContentCacheItemRes = await getCacheItemBySha256(content.sha256);
  getContentCacheItemRes.throwOnBad();
  const contentCacheItem = getContentCacheItemRes.data;

  let processedVideoFile = '';
  if (type === 'cut') {
    processedVideoFile = await cutVideoProcessingForCacheItem(contentCacheItem);
  } else if (type === 'convert') {
    processedVideoFile = await convertVideoProcessingForCacheItem(contentCacheItem);
  }
  contentCacheItem.processEnd();

  const ipfsObjectRes = await createIpfsObjectFromFile(processedVideoFile);
  ipfsObjectRes.throwOnBad();
  const ipfsObject = ipfsObjectRes.data;

  await putTokenMediaIpfsObject(tokenOriginalId, ipfsObject, mediaFlags);
}

export async function processingContentForVideoTypeOrg(orgView: TokenOriginalView) {
  const contentMain = orgView.TokenMedias.filter((v) => v.isOriginal)[0];

  await videoProcessingForContent(contentMain, BigInt(orgView.id), 'convert', {
    isPreview: true,
  });

  if (orgView.isUseCensored) {
    await videoProcessingForContent(contentMain, BigInt(orgView.id), 'cut', {
      isPreview: true,
      isCensored: true,
    });
  }
}
