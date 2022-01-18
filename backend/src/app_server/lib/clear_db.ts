import prisma from '@/lib_db/prisma';
import { MediaType } from '@prisma/client';
import { deleteObject } from '@/lib_ipfs/ipfs_storage';
import { deleteCacheItem } from '@/lib_ipfs/ipfs_cache';

export async function deleteIpfsObjectById(
  ipfsObjectId: bigint,
  params?: {
    ignoreTokenMediaId?: bigint;
    ignoreUserId?: bigint;
    ignoreThumbOrgId?: bigint;
  },
) {
  const ipfsObject = await prisma.ipfsObject.findFirst({
    where: {
      id: ipfsObjectId,
    },
    include: {
      Medias: true,
      UsersWithAvatar: true,
      UsersWithBackground: true,
      ThumbsOrg: {
        where: {
          orgIpfsObjectId: {
            not: ipfsObjectId,
          },
        },
      },
    },
  });

  let ipfsObjectMedias = ipfsObject.Medias ? ipfsObject.Medias : [];
  if (params && params.ignoreTokenMediaId) {
    ipfsObjectMedias = ipfsObjectMedias.filter((v) => v.id !== params.ignoreTokenMediaId);
  }

  let ipfsObjectUsersWithAvatars = ipfsObject.UsersWithAvatar ? ipfsObject.UsersWithAvatar : [];
  let ipfsObjectUsersWithBackgrounds = ipfsObject.UsersWithBackground ? ipfsObject.UsersWithBackground : [];
  if (params && params.ignoreUserId) {
    ipfsObjectUsersWithAvatars = ipfsObjectUsersWithAvatars.filter((v) => v.id !== params.ignoreUserId);
    ipfsObjectUsersWithBackgrounds = ipfsObjectUsersWithBackgrounds.filter((v) => v.id !== params.ignoreUserId);
  }

  let ipfsObjectThumbsOrg = ipfsObject.ThumbsOrg ? ipfsObject.ThumbsOrg : [];
  if (params && params.ignoreThumbOrgId) {
    ipfsObjectThumbsOrg = ipfsObjectThumbsOrg.filter((v) => v.id !== params.ignoreThumbOrgId);
  }

  if (
    ipfsObjectMedias.length > 0 ||
    ipfsObjectUsersWithAvatars.length > 0 ||
    ipfsObjectUsersWithBackgrounds.length > 0 ||
    ipfsObjectThumbsOrg.length > 0
  ) {
    return false;
  }

  // delete thumbs ...
  if (ipfsObject.type === MediaType.IMAGE && !ipfsObject.isThumb) {
    const ipfsObjectThumbs = await prisma.ipfsObjectThumb.findMany({
      where: {
        orgIpfsObjectId: ipfsObject.id,
      },
    });

    for (const ipfsObjectThumb of ipfsObjectThumbs) {
      await deleteIpfsObjectById(ipfsObjectThumb.thumbIpfsObjectId, {
        ignoreThumbOrgId: ipfsObject.id,
      });
    }

    await prisma.ipfsObjectThumb.deleteMany({
      where: {
        orgIpfsObjectId: ipfsObject.id,
      },
    });
  }

  if (ipfsObject.isThumb) {
    await prisma.ipfsObjectThumb.deleteMany({
      where: {
        thumbIpfsObjectId: ipfsObject.id,
      },
    });
  }

  await deleteObject(ipfsObject.sha256);
  await deleteCacheItem(ipfsObject.sha256);

  await prisma.ipfsObject.delete({
    where: {
      id: ipfsObject.id,
    },
  });
}

export async function deleteTokenOriginalById(tokenOriginalId: bigint) {
  const tokenOrg = await prisma.tokenOriginal.findFirst({
    where: {
      id: tokenOriginalId,
    },
    include: {
      TokenMedias: {
        include: {
          IpfsObject: true,
        },
      },
      TokensNFT: true,
    },
  });

  for (const tokenMedia of tokenOrg.TokenMedias) {
    await prisma.tokenMedia.delete({
      where: {
        id: tokenMedia.id,
      },
    });

    await deleteIpfsObjectById(tokenMedia.ipfsObjectId, {
      ignoreTokenMediaId: tokenMedia.id,
    });
  }

  for (const tokenNFT of tokenOrg.TokensNFT) {
    await prisma.lotToken.deleteMany({
      where: {
        tokenNftId: tokenNFT.id,
      },
    });

    await prisma.tokenNFT.delete({
      where: {
        id: tokenNFT.id,
      },
    });
  }

  await prisma.hiddenTokenOriginal.deleteMany({
    where: {
      tokenOriginalId: tokenOrg.id,
    },
  });

  const lots = await prisma.lot.findMany({
    where: {
      tokenOriginalId: tokenOrg.id,
    },
  });

  for (const lot of lots) {
    await prisma.lotToken.deleteMany({
      where: {
        lotId: lot.id,
      },
    });

    await prisma.lotBet.deleteMany({
      where: {
        lotId: lot.id,
      },
    });

    await prisma.lot.delete({
      where: {
        id: lot.id,
      },
    });
  }

  await prisma.tokenHistory.deleteMany({
    where: {
      tokenOriginalId: tokenOrg.id,
    },
  });

  await prisma.tokenOriginal.delete({
    where: {
      id: tokenOrg.id,
    },
  });
}

export async function deleteLotByLotId(lotId: bigint) {
  const lot = await prisma.lot.findFirst({
    where: {
      id: lotId,
    },
    include: {
      TokenOriginal: {
        include: {
          Lots: {
            where: {
              id: {
                not: lotId,
              },
            },
          },
        },
      },
      Bets: true,
      LotTokens: true,
    },
  });

  if (lot.TokenOriginal.Lots.length === 0) {
    await deleteTokenOriginalById(lot.TokenOriginal.id);

    return 1000;
  } else {
    await prisma.lotToken.deleteMany({
      where: {
        lotId: lot.id,
      },
    });

    await prisma.lotBet.deleteMany({
      where: {
        lotId: lot.id,
      },
    });

    await prisma.tokenHistory.deleteMany({
      where: {
        lotId: lot.id,
      },
    });

    await prisma.lot.delete({
      where: {
        id: lot.id,
      },
    });

    return 1001;
  }
}
