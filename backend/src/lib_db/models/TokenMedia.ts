import { deleteIpfsObjectById } from '@/app_server/lib/clear_db';
import prisma from '@/lib_db/prisma';
import { TokenMedia, MediaType, IpfsObject, TokenOriginal } from '@prisma/client';

export interface MediaFlags {
  isOriginal?: boolean;
  isConverted?: boolean;
  isPreview?: boolean;
  isCensored?: boolean;
  isWatermark?: boolean;
}

export function parseFlags(mediaFlags: MediaFlags) {
  mediaFlags.isOriginal = mediaFlags.isOriginal || false;
  mediaFlags.isConverted = mediaFlags.isConverted || false;
  mediaFlags.isPreview = mediaFlags.isPreview || false;
  mediaFlags.isCensored = mediaFlags.isCensored || false;
  mediaFlags.isWatermark = mediaFlags.isWatermark || false;
  return mediaFlags;
}

export async function putTokenMediaIpfsObject(tokenOriginalId: bigint, ipfsObject: IpfsObject, mediaFlags: MediaFlags) {
  mediaFlags = parseFlags(mediaFlags);

  const marketLotMedia = await prisma.tokenMedia.findFirst({
    where: {
      tokenOriginalId: tokenOriginalId,
      ...mediaFlags,
    },
    include: {
      IpfsObject: true,
    },
  });

  const mediaType = ipfsObject.type as MediaType;

  let lotMedia;
  if (marketLotMedia) {
    const oldIpfsObject = marketLotMedia.IpfsObject;

    lotMedia = await prisma.tokenMedia.update({
      where: {
        id: marketLotMedia.id,
      },
      data: {
        ipfsObjectId: ipfsObject.id,
        type: mediaType,
      },
    });

    await deleteIpfsObjectById(oldIpfsObject.id);
  } else {
    lotMedia = await prisma.tokenMedia.create({
      data: {
        tokenOriginalId: tokenOriginalId,
        ipfsObjectId: ipfsObject.id,
        type: mediaType,
        ...mediaFlags,
      },
    });
  }

  return lotMedia;
}

export type TokenMediaRow = TokenMedia & {
  TokenOriginal?: TokenOriginal;
  IpfsObject?: IpfsObject;
};

export class TokenMediaView {
  tokenOriginalId: string;
  type: MediaType;
  sha256: string | null;
  mime: string;
  isOriginal: boolean;
  isConverted: boolean;
  isPreview: boolean;
  isCensored: boolean;
  isWatermark: boolean;

  constructor(lotData: TokenMediaView) {
    for (const lotDataKey in lotData) {
      this[lotDataKey] = lotData[lotDataKey];
    }
  }

  static getByModel(model: TokenMediaRow) {
    const tokenMediaView = new TokenMediaView({
      tokenOriginalId: model.tokenOriginalId.toString(),
      type: model.type,
      sha256: model.IpfsObject ? model.IpfsObject.sha256 : null,
      mime: model.IpfsObject ? model.IpfsObject.mime : null,
      isOriginal: model.isOriginal,
      isConverted: model.isConverted,
      isPreview: model.isPreview,
      isCensored: model.isCensored,
      isWatermark: model.isWatermark,
    });

    return tokenMediaView;
  }
}

export class TokenMediaModel {
  model: TokenMediaRow;

  constructor(model: TokenMediaRow) {
    this.model = model;
  }

  static wrap(model: TokenMediaRow) {
    return new TokenMediaModel(model);
  }
}
