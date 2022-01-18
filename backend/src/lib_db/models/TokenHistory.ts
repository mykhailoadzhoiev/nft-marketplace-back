import { Prisma, TokenHistory, TokenOriginal, TokenNFT, User, Lot, LotBet, TokenHistoryType } from '@prisma/client';
import prisma from '@/lib_db/prisma';
import { TokenOriginalView } from './TokenOriginal';
import { TokenNFTView } from './TokenNFT';
import { UserView } from './User';
import { LotView } from './Lot';
import { LotBetView } from './LotBet';
import { Enumerable } from '@/lib_common/support.types';
import * as _ from 'lodash';

export type TokenHistoryRow = TokenHistory & {
  TokenOriginal?: TokenOriginal;
  TokenNFT?: TokenNFT;
  User?: User;
  UserOldOwner?: User;
  Lot?: Lot;
  Bet?: LotBet;
};

export class TokenHistoryView {
  id: string;
  type: TokenHistoryType;
  tokenOriginalId: string;
  tokenNftId: string | null;
  userId: string | null;
  lotId: string | null;
  betId: string | null;
  buyPrice: string | null; // Desimal (wei)
  createdAt: Date;
  updatedAt: Date;

  TokenOriginal?: TokenOriginalView;
  TokenNFT?: TokenNFTView;
  User?: UserView;
  UserOldOwner?: UserView;
  Lot?: LotView;
  Bet?: LotBetView;

  constructor(modelPublic: TokenHistoryView) {
    for (const key in modelPublic) {
      this[key] = modelPublic[key];
    }
  }

  static getByModel(model: TokenHistoryRow): TokenHistoryView {
    const modelView = new TokenHistoryView({
      id: model.id.toString(),
      type: model.type,
      tokenOriginalId: model.tokenOriginalId.toString(),
      tokenNftId: model.tokenNftId ? model.tokenNftId.toString() : null,
      userId: model.userId ? model.userId.toString() : null,
      lotId: model.lotId ? model.lotId.toString() : null,
      betId: model.betId ? model.betId.toString() : null,
      buyPrice: model.buyPrice ? model.buyPrice.toFixed() : null,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });

    if (model.TokenOriginal) {
      modelView.TokenOriginal = TokenOriginalView.getByModel(model.TokenOriginal);
    }
    if (model.TokenNFT) {
      modelView.TokenNFT = TokenNFTView.getByModel(model.TokenNFT);
    }
    if (model.User) {
      modelView.User = UserView.getByModel(model.User);
    }
    if (model.UserOldOwner) {
      modelView.UserOldOwner = UserView.getByModel(model.UserOldOwner);
    }
    if (model.Lot) {
      modelView.Lot = LotView.getByModel(model.Lot);
    }
    if (model.Bet) {
      modelView.Bet = LotBetView.getByModel(model.Bet);
    }

    return modelView;
  }
}

export class TokenHistoryModel {
  model: TokenHistory;

  constructor(model: TokenHistory) {
    this.model = model;
  }

  static wrap(model: TokenHistory) {
    return new TokenHistoryModel(model);
  }
}

export class TokenHistoryFetch {
  rowsQuery = {} as Prisma.TokenHistoryFindManyArgs;

  constructor(initialQuery: Prisma.TokenHistoryFindManyArgs) {
    this.rowsQuery = initialQuery;
  }

  orderBy(orderByParams: Enumerable<Prisma.TokenHistoryOrderByWithRelationInput>) {
    this.rowsQuery = _.merge(this.rowsQuery, {
      orderBy: orderByParams,
    });
    return this;
  }

  where(whereParams: Prisma.TokenHistoryWhereInput) {
    this.rowsQuery = _.merge(this.rowsQuery, {
      where: whereParams,
    });
    return this;
  }

  async fetch() {
    const countQuery = {
      where: this.rowsQuery.where || {},
    };
    const rows = await prisma.tokenHistory.findMany(this.rowsQuery);
    const rowsTotal = await prisma.tokenHistory.count(countQuery);

    return { rows, rowsTotal };
  }
}
