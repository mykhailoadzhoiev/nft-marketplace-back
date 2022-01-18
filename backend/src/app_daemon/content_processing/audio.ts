import { putTokenMediaIpfsObject, MediaFlags, TokenMediaView } from 'src/lib_db/models/TokenMedia';
import { TokenOriginalView } from 'src/lib_db/models/TokenOriginal';
import { createIpfsObjectFromFile, getCacheItemBySha256 } from '@/lib_ipfs/ipfs_oms';
import { CacheItem } from '@/lib_ipfs/ipfs_cache';
import Bs58 from '@/lib_common/bs58';
import env from '@/lib_common/env';
import { resolve } from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import * as utils from '@/lib_common/utils';

async function cutAudioProcessingForCacheItem(cacheItem: CacheItem) {
  const tempFile = resolve(env.DIR_TEMP_FILES, Bs58.uuid() + '.aac');
  const sourcePath = cacheItem.pathFile;

  const fileInfo = await utils.getMediaContentProbe(sourcePath);
  const duration = parseFloat(fileInfo.audioStreams[0].duration);
  let targetDuration = duration * (duration < 10 ? 0.3 : 0.1);

  await new Promise((resolve, reject) => {
    ffmpeg({ source: sourcePath })
      .setStartTime(0)
      .setDuration(targetDuration)
      .addOptions(['-profile:v main', '-movflags +faststart', '-c:a aac'])
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

async function audioProcessingForContent(
  content: TokenMediaView,
  tokenOriginalId: bigint,
  type: 'cut',
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
    processedVideoFile = await cutAudioProcessingForCacheItem(contentCacheItem);
  }
  contentCacheItem.processEnd();

  const ipfsObjectRes = await createIpfsObjectFromFile(processedVideoFile);
  ipfsObjectRes.throwOnBad();
  const ipfsObject = ipfsObjectRes.data;

  await putTokenMediaIpfsObject(tokenOriginalId, ipfsObject, mediaFlags);
}

export async function processingContentForAudioTypeOrg(orgView: TokenOriginalView) {
  const contentMain = orgView.TokenMedias.filter((v) => v.isOriginal)[0];

  if (orgView.isUseCensored) {
    await audioProcessingForContent(contentMain, BigInt(orgView.id), 'cut', {
      isPreview: true,
      isCensored: true,
    });
  }
}
