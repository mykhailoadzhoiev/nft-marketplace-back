import prisma from '@/lib_db/prisma';
import {
  Lot,
  LotStatus,
  MediaType,
  LotSaleType,
  LotBet,
  User,
  MarketCategory,
  LotToken,
  TokenNFT,
  TaskType,
  Prisma,
} from '@prisma/client';

import { imagesUserScope, UserView } from './User';
import { LotBetView } from './LotBet';
import { LotTokenView } from './LotToken';
import { TokenOriginalRow, TokenOriginalView } from './TokenOriginal';
import { taskCreate } from './Task';
import * as _ from 'lodash';
import { Enumerable } from '@/lib_common/support.types';

export const scopes = {
  standartMarketSkope: {
    User: {
      include: {
        ...imagesUserScope(),
      },
    },
    TokenOriginal: {
      include: {
        TokenMedias: {
          include: {
            IpfsObject: true,
          },
        },
      },
    },
  },
};

export function isValidContentType(val: any) {
  return Object.values(MediaType).indexOf(val) !== -1;
}

export async function getLotById(lotId: bigint): Promise<Lot | null> {
  const lot = await prisma.lot.findFirst({
    where: {
      id: lotId,
    },
  });

  if (lot) {
    return lot;
  }

  return null;
}

export async function getTopBetByLotId(lotId: bigint): Promise<LotBet | null> {
  const topBet = await prisma.lotBet.findFirst({
    where: {
      lotId: lotId,
    },
    orderBy: {
      id: 'desc',
    },
  });

  if (!topBet) {
    return null;
  }

  return topBet;
}

export async function getLotBetsByLotId(lotId: bigint): Promise<LotBet[]> {
  const lotBets = await prisma.lotBet.findMany({
    where: {
      lotId: lotId,
    },
    orderBy: {
      betAmount: 'desc',
    },
  });

  return lotBets;
}

export async function getLotTokensByLot(lot: Lot): Promise<TokenNFT[]> {
  const tokenOriginal = await prisma.tokenOriginal.findFirst({
    where: {
      id: lot.tokenOriginalId,
    },
  });

  const tokensNft = await prisma.tokenNFT.findMany({
    where: {
      userId: lot.userId,
    },
  });

  return tokensNft;
}

export async function closeLotAuctionByLotId(lotId: bigint) {
  const lot = await prisma.lot.findFirst({
    where: {
      id: lotId,
    },
  });

  if (!lot) {
    throw new Error('lot not found');
  }

  if (lot.status !== LotStatus.IN_SALES) {
    throw new Error('lot bad status');
  }

  const updatedLot = await prisma.lot.update({
    where: {
      id: lot.id,
    },
    data: {
      status: LotStatus.CLOSED,
    },
  });

  await taskCreate(TaskType.LOT_POST_CLOSE, {
    lotId: lot.id.toString(),
  });

  return updatedLot;
}

export type LotViewType = 'public' | 'private';
export type LotRow = Lot & {
  User?: User;
  TokenOriginal?: TokenOriginalRow;
  MarketCategory?: MarketCategory;
  Bets?: LotBet[];
  LotTokens?: LotToken[];
};
export class LotView {
  id: string;
  saleType: LotSaleType;
  userId: string;
  status: LotStatus;
  tokenOriginalId: string;
  minimalCost: string;
  currentCost: string;
  copiesSold: number;
  copiesTotal: number;
  expiresAt: Date | null;
  lastActiveAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  isTop: boolean;
  marketplaceVer: number;

  User?: UserView;
  TokenOriginal?: TokenOriginalView;
  Bets?: LotBetView[];
  LotTokens?: LotTokenView[];

  constructor(modelPublic: LotView) {
    for (const key in modelPublic) {
      this[key] = modelPublic[key];
    }
  }

  static getByModel(model: LotRow): LotView {
    const refs = {} as {
      User?: UserView;
      TokenOriginal?: TokenOriginalView;
      Bets?: LotBetView[];
      LotTokens?: LotTokenView[];
    };

    if (model.User) {
      refs.User = UserView.getByModel(model.User);
    }
    if (model.TokenOriginal) {
      refs.TokenOriginal = TokenOriginalView.getByModel(model.TokenOriginal);
    }
    if (model.Bets) {
      refs.Bets = model.Bets.map((v) => LotBetView.getByModel(v));
    }
    if (model.LotTokens) {
      refs.LotTokens = model.LotTokens.map((v) => LotTokenView.getByModel(v));
    }

    const lotView = new LotView({
      id: model.id.toString(),
      saleType: model.saleType,
      userId: model.userId.toString(),
      status: model.status,
      tokenOriginalId: model.tokenOriginalId.toString(),
      minimalCost: model.minimalCost.toFixed(),
      currentCost: model.currentCost.toFixed(),
      copiesSold: model.copiesSold,
      copiesTotal: model.copiesTotal,
      expiresAt: model.expiresAt,
      lastActiveAt: model.lastActiveAt,
      updatedAt: model.updatedAt,
      createdAt: model.createdAt,
      isTop: model.isTop,
      marketplaceVer: model.marketplaceVer,

      ...refs,
    });

    return lotView;
  }
}

export class LotModel {
  model: LotRow;

  constructor(model: LotRow) {
    this.model = model;
  }

  static wrap(model: LotRow) {
    return new LotModel(model);
  }
}

export interface SignsData {
  tokenNftId: string;
  sign: string;
}

export function checkSignsData(tokenSignData: SignsData) {
  if (typeof tokenSignData.tokenNftId !== 'string') {
    return false;
  }

  if (typeof tokenSignData.sign !== 'string' || tokenSignData.sign.length > 150) {
    return false;
  }

  return true;
}

export async function checkLotExistsByLotId(lotId: string, validationTemp?: any) {
  const lotIdBI = BigInt(lotId);

  const lot = await prisma.lot.findFirst({
    where: {
      id: lotIdBI,
    },
  });

  if (!lot) {
    return false;
  }

  if (validationTemp) {
    validationTemp.lot = lot;
  }

  return true;
}

export async function checkLotTokenNftById(tokenNftId: string, validationTemp?: any) {
  const tokenNftIdBN = BigInt(tokenNftId);

  const lot = validationTemp.lot as Lot;

  if (!lot) {
    return false;
  }

  const tokenNft = await prisma.tokenNFT.findFirst({
    where: {
      id: tokenNftIdBN,
    },
  });

  if (!tokenNft) {
    return false;
  }

  if (tokenNft.currentLotId !== lot.id) {
    return false;
  }

  return true;
}

export class LotFetch {
  rowsQuery: Prisma.LotFindManyArgs = {};

  constructor(initialQuery: Prisma.LotFindManyArgs) {
    this.rowsQuery = initialQuery;
  }

  orderBy(orderByParams: Enumerable<Prisma.LotOrderByWithRelationInput>) {
    this.rowsQuery = _.merge(this.rowsQuery, {
      orderBy: orderByParams,
    });
    return this;
  }

  where(whereParams: Prisma.LotWhereInput) {
    this.rowsQuery = _.merge(this.rowsQuery, {
      where: whereParams,
    });
    return this;
  }

  async fetch() {
    const countQuery = {
      where: this.rowsQuery.where || {},
    };
    const rows = await prisma.lot.findMany(this.rowsQuery);
    const rowsTotal = await prisma.lot.count(countQuery);

    return { rows, rowsTotal };
  }
}
