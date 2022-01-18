import * as Jimp from 'jimp';
import { putTokenMediaIpfsObject, MediaFlags, TokenMediaView } from 'src/lib_db/models/TokenMedia';
import { TokenOriginalView } from 'src/lib_db/models/TokenOriginal';
import { getCacheItemBySha256, createIpfsObjectFromFile } from '@/lib_ipfs/ipfs_oms';
import Bs58 from '@/lib_common/bs58';
import env from '@/lib_common/env';
import { resolve } from 'path';
import * as JPEG from 'jpeg-js';
import * as fs from 'fs-extra';

const waterMarkFile = resolve(process.cwd(), 'assets', 'watermark.png');

Jimp.decoders['image/jpeg'] = (data: Buffer) => JPEG.decode(data, { maxMemoryUsageInMB: 2048 });

async function watermarkProcessingForFile(filePath: string, attempt = 0) {
  const tempFile = resolve(env.DIR_TEMP_FILES, Bs58.uuid() + '.jpg');

  try {
    const image = await Jimp.read(filePath);
    const watermark = await Jimp.read(waterMarkFile);

    const logoWidth = image.bitmap.width / 8;
    const padding = 32;

    await watermark.resize(logoWidth, Jimp.AUTO);

    const X = padding;
    const Y = image.bitmap.height - (padding + logoWidth);

    await image.composite(watermark, X, Y, {
      mode: Jimp.BLEND_SCREEN,
      opacitySource: 0.8,
      opacityDest: 1,
    });

    image.quality(50);

    await image.write(tempFile);
  } catch (error) {
    console.log(`watermarkProcessingForFile error (attempt=${attempt}):`, error);

    if (attempt < 10) {
      return await watermarkProcessingForFile(filePath, attempt + 1);
    } else {
      throw new Error('image watermark processing error attempts');
    }
  }

  return tempFile;
}

async function blurProcessingForFile(filePath: string, attempt = 0) {
  const tempFile = resolve(env.DIR_TEMP_FILES, Bs58.uuid() + '.jpg');

  try {
    const image = await Jimp.read(filePath);

    await image.blur(15);
    await image.quality(50);
    await image.write(tempFile);
  } catch (error) {
    console.log(`blurProcessingForFile error (attempt=${attempt}):`, error);

    if (attempt < 10) {
      return await blurProcessingForFile(filePath, attempt + 1);
    } else {
      throw new Error('image blur processing error attempts');
    }
  }

  return tempFile;
}

async function watermarkForImageContent(content: TokenMediaView, tokenOriginalId: bigint, mediaFlags: MediaFlags) {
  if (!content) {
    throw new Error('no content');
  }

  const getContentCacheItemRes = await getCacheItemBySha256(content.sha256);
  getContentCacheItemRes.throwOnBad();
  const contentCacheItem = getContentCacheItemRes.data;

  const newFile = await watermarkProcessingForFile(contentCacheItem.pathFile);
  contentCacheItem.processEnd();

  const ipfsObjectRes = await createIpfsObjectFromFile(newFile);
  ipfsObjectRes.throwOnBad();
  const ipfsObject = ipfsObjectRes.data;

  await putTokenMediaIpfsObject(tokenOriginalId, ipfsObject, mediaFlags);
}

async function blurAndWatermarkForImageContent(
  content: TokenMediaView,
  tokenOriginalId: bigint,
  mediaFlags: MediaFlags,
) {
  if (!content) {
    throw new Error('no content');
  }

  const getContentCacheItemRes = await getCacheItemBySha256(content.sha256);
  getContentCacheItemRes.throwOnBad();
  const contentCacheItem = getContentCacheItemRes.data;

  const bluredFile = await blurProcessingForFile(contentCacheItem.pathFile);
  contentCacheItem.processEnd();

  const newFile = await watermarkProcessingForFile(bluredFile);
  await fs.remove(bluredFile);

  const ipfsObjectRes = await createIpfsObjectFromFile(newFile);
  ipfsObjectRes.throwOnBad();
  const ipfsObject = ipfsObjectRes.data;

  await putTokenMediaIpfsObject(tokenOriginalId, ipfsObject, {
    isWatermark: true,
    isCensored: true,
  });
}

export async function processingContentForImageTypeOrg(orgView: TokenOriginalView) {
  const contentOrg = orgView.TokenMedias.filter((v) => v.isOriginal)[0];

  if (orgView.isUseCensored) {
    await blurAndWatermarkForImageContent(contentOrg, BigInt(orgView.id), {
      isWatermark: true,
    });
  } else {
    await watermarkForImageContent(contentOrg, BigInt(orgView.id), {
      isWatermark: true,
    });
  }
}
