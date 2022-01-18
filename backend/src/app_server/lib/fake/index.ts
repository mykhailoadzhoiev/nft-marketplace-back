import { User, Prisma, TokenNFT, TokenOriginal, IpfsObject } from '@prisma/client';
import env from '@/lib_common/env';
import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs-extra';
import * as path from 'path';
import Bs58 from '@/lib_common/bs58';
import * as _ from 'lodash';
import * as moment from 'moment';
import * as IpfsOms from '@/lib_ipfs/ipfs_oms';
import prisma from '@/lib_db/prisma';
import { UserModel } from '@/lib_db/models/User';
import * as LotMediaStuff from '@/lib_db/models/TokenMedia';
import { Stream } from 'stream';

function getRandomTempFilePath() {
  return path.resolve(env.DIR_TEMP_FILES, Bs58.uuid());
}

async function loadRandomImage(w = 1100, h = 1100): Promise<string> {
  const randomImageUrl = `https://picsum.photos/${w}/${h}`;
  const tempFile = getRandomTempFilePath();
  const writer = fs.createWriteStream(tempFile);
  const res = (await axios({
    method: 'get',
    url: randomImageUrl,
    responseType: 'stream',
  })) as AxiosResponse<Stream>;
  res.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      resolve(tempFile);
    });
    writer.on('error', reject);
  });
}

export async function createFakeImageIpfsObject(params?: {
  attempts: number;
  w: number;
  h: number;
}): Promise<IpfsObject> {
  params = params || {
    attempts: 0,
    w: 580,
    h: 580,
  };
  params.attempts = typeof params.attempts === 'number' ? params.attempts : 0;
  params.w = params.w || 580;
  params.h = params.h || 580;

  const randomImage = await loadRandomImage(params.w, params.h);
  const getIpfsObjectRes = await IpfsOms.createIpfsObjectFromFile(randomImage, {
    noValidation: true,
  });
  if (getIpfsObjectRes.isBad) {
    console.log(getIpfsObjectRes);
    if (params.attempts < 3) {
      params.attempts++;
      return await createFakeImageIpfsObject(params);
    }
  }

  const ipfsObject = getIpfsObjectRes.data;
  return ipfsObject;
}

export async function createFakeUser() {
  const newUser = await UserModel.createUser(null, Bs58.uuid(), {
    params: {
      metamaskAddress: Bs58.uuid(),
      metamaskMessage: Bs58.uuid(),
      metamaskSignature: Bs58.uuid(),
    },
  });

  console.log(`Created user ${newUser.id}`);

  return newUser;
}

export async function createFakeUsers(count = 10) {
  const users = [] as User[];

  for (let n = 0; n < count; n++) {
    const newUser = await createFakeUser();
    users.push(newUser);
  }

  return users;
}

export type StdTokenOriginal = TokenOriginal & {
  User: User;
  TokensNFT: TokenNFT[];
};

export async function createFakeTokenOrigin(params?: { user?: User; copiesTotal?: number }) {
  params = params || {};
  const user = params.user || (await createFakeUser());

  const newOrg = await prisma.tokenOriginal.create({
    data: {
      contentType: 'IMAGE',
      userId: user.id,
      name: Bs58.uuid(),
      description: Bs58.uuid(),
    },
  });
  console.log(`Created token original ${newOrg.id.toString()}`);

  await prisma.tokenHistory.create({
    data: {
      type: 'ORG_PUBLISHED',
      tokenOriginalId: newOrg.id,
      userId: newOrg.userId,
    },
  });

  const ipfsObject = await createFakeImageIpfsObject();
  const mediaOriginal = await LotMediaStuff.putTokenMediaIpfsObject(newOrg.id, ipfsObject, {
    isOriginal: true,
  });
  console.log(
    `Created token media (isOriginal) ${mediaOriginal.id.toString()} for token original ${newOrg.id.toString()}`,
  );

  const mediaWatermark = await LotMediaStuff.putTokenMediaIpfsObject(newOrg.id, ipfsObject, {
    isWatermark: true,
  });
  console.log(
    `Created token media (isWatermark) ${mediaWatermark.id.toString()} for token original ${newOrg.id.toString()}!`,
  );

  const tokenOrigin = await prisma.tokenOriginal.findFirst({
    where: {
      id: newOrg.id,
    },
    include: {
      User: true,
      TokensNFT: true,
    },
  });

  return tokenOrigin;
}

export async function createFakeLot(params?: { betUsers?: User[]; lotUser?: User; tokenOriginal?: StdTokenOriginal }) {
  params = params || {};
  const lotUser = params.tokenOriginal ? params.tokenOriginal.User : params.lotUser || (await createFakeUser());
  const betUsers = params.betUsers || (await createFakeUsers(2));

  let tokenOriginal: StdTokenOriginal;
  if (params.tokenOriginal) {
    tokenOriginal = params.tokenOriginal;
  } else {
    tokenOriginal = await createFakeTokenOrigin({
      user: lotUser,
    });
  }

  const newLot = await prisma.lot.create({
    data: {
      isUseTimer: false,
      tokenOriginalId: tokenOriginal.id,
      status: 'IN_SALES',
      expiresAt: null,
      copiesTotal: _.random(2, 3),
      userId: lotUser.id,
      minimalCost: '0',
      currentCost: '0',
      sellerSignsData: [],
    },
  });
  await prisma.tokenHistory.create({
    data: {
      type: 'LOT_CREATED',
      tokenOriginalId: tokenOriginal.id,
      lotId: newLot.id,
      userId: newLot.userId,
    },
  });

  console.log(`Created lot ${newLot.id.toString()} for token original ${tokenOriginal.id.toString()}`);

  for (let index = 0; index < newLot.copiesTotal; index++) {
    const token = Bs58.uuid();

    const tokenNft = await prisma.tokenNFT.create({
      data: {
        tokenOriginalId: tokenOriginal.id,
        userId: lotUser.id,
        token: token,
        index,
        currentLotId: newLot.id,
      },
    });
    await prisma.tokenHistory.create({
      data: {
        type: 'NFT_TOKEN_ADDED',
        tokenOriginalId: tokenOriginal.id,
        tokenNftId: tokenNft.id,
        userId: tokenNft.userId,
      },
    });

    const lotToken = await prisma.lotToken.create({
      data: {
        lotId: newLot.id,
        tokenNftId: tokenNft.id,
      },
    });

    console.log(`Created NFT token ${tokenNft.id.toString()} for token original ${tokenOriginal.id.toString()}`);
    console.log(`Created lot token ${lotToken.id.toString()} for lot ${newLot.id.toString()}`);
  }

  const betCouunt = _.random(1, 3);
  let betAmount: Prisma.Decimal;
  for (let index = 0; index < betCouunt; index++) {
    const betUser = _.sample(betUsers) as User;
    betAmount = new Prisma.Decimal(index * 10 + 10);

    const lotBet = await prisma.lotBet.create({
      data: {
        userId: betUser.id,
        lotId: newLot.id,
        betAmount: betAmount.toFixed(),
        buyerSignsData: [],
      },
    });
    await prisma.tokenHistory.create({
      data: {
        type: 'LOT_BET_CREATED',
        tokenOriginalId: tokenOriginal.id,
        lotId: newLot.id,
        userId: betUser.id,
        betId: lotBet.id,
      },
    });

    console.log(
      `Created lot bet (amount: ${betAmount.toFixed()}) ${lotBet.id.toString()} for lot ${newLot.id.toString()}`,
    );
  }

  const ulot = await prisma.lot.update({
    where: {
      id: newLot.id,
    },
    data: {
      currentCost: betAmount.toFixed(),
      lastActiveAt: moment().toISOString(),
    },
  });

  return ulot;
}
