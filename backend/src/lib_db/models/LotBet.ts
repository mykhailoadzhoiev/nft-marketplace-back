import prisma from '@/lib_db/prisma';
import { LotBet, TokenNFT, Lot, User } from '@prisma/client';
import { UserView } from './User';
import { TokenNFTView } from './TokenNFT';
import { LotView } from './Lot';

export async function getLotBetById(betId: bigint) {
  const bet = await prisma.lotBet.findFirst({
    where: {
      id: betId,
    },
  });

  if (bet) {
    return bet;
  }

  return null;
}

export type LotBetRow = LotBet & {
  Lot?: Lot;
  User?: User;
  TokenNFT?: TokenNFT;
};
export class LotBetView {
  id: string;
  lotId: string;
  userId: string;
  tokenNftId: string;
  betAmount: string;
  isWin: boolean;
  createdAt: Date;
  updatedAt: Date;
  isCancel: boolean;

  Lot?: LotView;
  User?: UserView;
  TokenNFT?: TokenNFTView;

  constructor(model: LotBetView) {
    for (const modelKey in model) {
      this[modelKey] = model[modelKey];
    }
  }

  static getByModel(model: LotBetRow) {
    const refs = {} as {
      Lot?: LotView;
      User?: UserView;
      TokenNFT?: TokenNFTView;
    };
    if (model.Lot) {
      refs.Lot = LotView.getByModel(model.Lot);
    }
    if (model.User) {
      refs.User = UserView.getByModel(model.User);
    }
    if (model.TokenNFT) {
      refs.TokenNFT = TokenNFTView.getByModel(model.TokenNFT);
    }

    const modelPublic = new LotBetView({
      id: model.id.toString(),
      lotId: model.lotId.toString(),
      userId: model.userId.toString(),
      tokenNftId: model.tokenNftId ? model.tokenNftId.toString() : null,
      betAmount: model.betAmount.toFixed(),
      isWin: model.isWin,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      isCancel: model.isCancel,

      ...refs,
    });

    return modelPublic;
  }
}

export class LotBetModel {
  model: LotBet;

  constructor(model: LotBet) {
    this.model = model;
  }

  static wrap(model: LotBet) {
    return new LotBetModel(model);
  }
}
