import { LotToken, Lot, TokenNFT } from '@prisma/client';
import { LotView } from '@/lib_db/models/Lot';
import { TokenNFTView } from '@/lib_db/models/TokenNFT';

export type LotTokenRow = LotToken & {
  Lot?: Lot;
  TokenNFT?: TokenNFT;
};

export class LotTokenView {
  id: string;
  lotId: string;
  tokenNftId: string;
  isSold: boolean;
  isProcessin: boolean;

  Lot?: LotView;
  TokenNFT?: TokenNFTView;

  constructor(modelPublic: LotTokenView) {
    for (const key in modelPublic) {
      this[key] = modelPublic[key];
    }
  }

  static getByModel(model: LotTokenRow) {
    const refs = {} as {
      Lot?: LotView;
      TokenNFT?: TokenNFTView;
    };
    if (model.Lot) {
      refs.Lot = LotView.getByModel(model.Lot);
    }
    if (model.TokenNFT) {
      refs.TokenNFT = TokenNFTView.getByModel(model.TokenNFT);
    }

    return new LotTokenView({
      id: model.id.toString(),
      lotId: model.lotId.toString(),
      tokenNftId: model.tokenNftId.toString(),
      isSold: model.isSold,
      isProcessin: model.isProcessin,

      ...refs,
    });
  }
}

export class LotTokenModel {
  model: LotToken;

  constructor(model: LotToken) {
    this.model = model;
  }

  static wrap(model: LotToken) {
    return new LotTokenModel(model);
  }
}
