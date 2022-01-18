import prisma from '@/lib_db/prisma';
import { TokenNFT, User, Lot, LotBet, TokenOriginal, LotToken, TokenHistoryType } from '@prisma/client';
import { LotView, LotViewType } from './Lot';
import { LotBetView } from './LotBet';
import { LotTokenView } from './LotToken';
import { TokenOriginalView } from './TokenOriginal';
import { UserView } from './User';

export async function getTokenNFTById(betId: bigint) {
  const eftToken = await prisma.tokenNFT.findFirst({
    where: {
      id: betId,
    },
  });

  if (eftToken) {
    return eftToken;
  }

  return null;
}

export async function tokenNftCreate(params: {
  token: string;
  tokenIndex: number;
  tokenOriginalId: bigint;
  userId: bigint;
  lotId: bigint;
}) {
  const tokenNft = await prisma.tokenNFT.create({
    data: {
      tokenOriginalId: params.tokenOriginalId,
      userId: params.userId,
      token: params.token,
      index: params.tokenIndex,
    },
  });

  const tokenHistory = await prisma.tokenHistory.create({
    data: {
      type: TokenHistoryType.NFT_TOKEN_ADDED,
      tokenOriginalId: params.tokenOriginalId,
      tokenNftId: tokenNft.id,
      userId: params.userId,
      lotId: params.lotId,
    },
  });

  return tokenNft;
}

export type TokenNFTRow = TokenNFT & {
  User?: User;
  TokenOriginal?: TokenOriginal;
  CurrentLot?: Lot;
  LotTokens?: LotToken[];
  LotBets?: LotBet[];
};
export class TokenNFTView {
  id: string;
  userId: string;
  tokenOriginalId: string;
  token: string;
  index: number;
  currentLotId: string | null;
  createdAt: Date;

  User?: UserView;
  TokenOriginal?: TokenOriginalView;
  CurrentLot?: LotView | null;
  LotTokens?: LotTokenView[];
  LotBets?: LotBetView[];

  constructor(lotData: TokenNFTView) {
    for (const lotDataKey in lotData) {
      this[lotDataKey] = lotData[lotDataKey];
    }
  }

  static getByModel(model: TokenNFTRow) {
    const refs = {} as {
      User?: UserView;
      TokenOriginal?: TokenOriginalView;
      CurrentLot?: LotView | null;
      LotTokens?: LotTokenView[];
      LotBets?: LotBetView[];
    };
    if (model.User) {
      refs.User = UserView.getByModel(model.User);
    }
    if (model.TokenOriginal) {
      refs.TokenOriginal = TokenOriginalView.getByModel(model.TokenOriginal);
    }
    if (typeof model.CurrentLot !== 'undefined') {
      refs.CurrentLot = model.CurrentLot ? LotView.getByModel(model.CurrentLot) : null;
    }
    if (model.LotTokens) {
      refs.LotTokens = model.LotTokens.map((v) => LotTokenView.getByModel(v));
    }
    if (model.LotBets) {
      refs.LotBets = model.LotBets.map((v) => LotBetView.getByModel(v));
    }

    const eftTokenView = new TokenNFTView({
      id: model.id.toString(),
      userId: model.userId.toString(),
      tokenOriginalId: model.tokenOriginalId.toString(),
      token: model.token,
      index: model.index,
      currentLotId: model.currentLotId ? model.currentLotId.toLocaleString() : null,
      createdAt: model.createdAt,

      ...refs,
    });

    return eftTokenView;
  }
}

export class TokenNFTModel {
  model: TokenNFT;

  constructor(model: TokenNFT) {
    this.model = model;
  }

  static wrap(model: TokenNFT) {
    return new TokenNFTModel(model);
  }
}
