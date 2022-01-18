import axios from 'axios';
import { BaseFetchParams, LotSaleType, LotStatus, LotTokenView, TokenNFTView, TokenOriginalView } from './types';
import { UserView, LotView, TRes, FRes, TokenMediaView, LotBetView, TokenHistoryView, TokenHistoryType } from './types';

/*
  getMarketCatigories
*/

export function getMarketCatigories(): TRes<
  {
    id: string;
    name: string;
  }[]
> {
  return axios.get('/api/market/catigories');
}

/*
  getMarketTopLots
*/

export function getMarketTopLots(): TRes<
  (LotView & {
    User: UserView;
    TokenOriginal: TokenOriginalView & {
      TokenMedias: TokenMediaView;
    };
  })[]
> {
  return axios.get('/api/market/top_lots');
}

/*
  getFetchMarketLots
*/

export type ParamsGetFetchMarketLots = BaseFetchParams & {
  sortBy?: 'lastActiveAt' | 'createdAt' | 'updatedAt' | 'currentCost' | 'viewsRating' | 'expiresAt';

  // filters:
  search?: string;
  status?: LotStatus;
  updateAtIsAfter?: Date; // string
  categoryId?: string; // bigint
  userId?: string; // bigint
  saleType?: LotSaleType;
  hasATimeLimit?: '0' | '1'; // aka boolean
};

export function getFetchMarketLots(params: ParamsGetFetchMarketLots): FRes<
  LotView & {
    User: UserView;
    TokenOriginal: TokenOriginalView & {
      TokenMedias: TokenMediaView;
    };
  }
> {
  return axios.get('/api/market/lots', { params });
}

/*
  getFetchMarketLotsFromFollowings
*/

export type ParamsGetFetchMarketLotsFromFollowings = BaseFetchParams & {
  sortBy?: 'lastActiveAt' | 'createdAt' | 'updatedAt' | 'currentCost' | 'viewsRating' | 'expiresAt';

  // filters:
  search?: string;
  status?: LotStatus;
  updateAtIsAfter?: Date; // string
  categoryId?: string; // bigint
  userId?: string; // bigint
  saleType?: LotSaleType;
};

export function getFetchMarketLotsFromFollowings(params: ParamsGetFetchMarketLotsFromFollowings): FRes<
  LotView & {
    User: UserView;
    TokenOriginal: TokenOriginalView & {
      TokenMedias: TokenMediaView;
    };
  }
> {
  return axios.get('/api/market/lots_from_followings', { params });
}

/*
  getMarketLotById
*/

export function getMarketLotById(lotId: string): TRes<
  LotView & {
    User: UserView;
    TokenOriginal: TokenOriginalView & {
      TokenMedias: TokenMediaView;
    };
    LotTokens: LotTokenView & {
      TokenNFT: TokenNFTView;
    };
    Bets: LotBetView[]; // only last bet if exists
  }
> {
  return axios.get(`/api/market/lots/${lotId}`);
}

/*
  getFetchMarketTokens
*/

export type ParamsGetFetchMarketTokens = BaseFetchParams & {
  sortBy?: 'id' | 'userId' | 'token' | 'createdAt';

  // filters:
  userId?: string; // bigint
};

export function getFetchMarketTokens(params: ParamsGetFetchMarketTokens): FRes<TokenNFTView> {
  return axios.get('/api/market/tokens', { params });
}

/*
  getFetchMarketBets
*/

export type ParamsGetFetchMarketBets = BaseFetchParams & {
  sortBy?: 'id' | 'createdAt' | 'betAmount' | 'lotId' | 'userId';

  // filters:
  lotId?: string; // bigint
  userId?: string; // bigint
  eftTokenId?: string; // bigint
};

export function getFetchMarketBets(params: ParamsGetFetchMarketBets): FRes<
  LotBetView & {
    User: UserView;
  }
> {
  return axios.get(`/api/market/bets`, { params });
}

/*
  getFetchTokensOriginal
*/

export type ParamsGetFetchTokensOriginal = BaseFetchParams & {
  sortBy?: 'id' | 'updatedAt' | 'createdAt';

  // filters:
  name?: string;
  categoryId?: string; // bigint
  userId?: string; // bigint
};

export function getFetchTokensOriginal(params: ParamsGetFetchTokensOriginal): FRes<
  TokenOriginalView & {
    User: UserView;
    Lots: LotView[]; // only active lots
    TokensNFT: TokenNFTView & {
      User: UserView;
    };
    TokenMedias: TokenMediaView[];
  }
> {
  return axios.get('/api/market/tokens_original', { params });
}

/*
  getTokenOriginalById
*/

export function getTokenOriginalById(tokenOriginalId: string): TRes<
  TokenOriginalView & {
    User: UserView;
    Lots: LotView[]; // only active lots
    TokensNFT: TokenNFTView & {
      User: UserView;
    };
    TokenMedias: TokenMediaView[];
  }
> {
  return axios.get(`/api/market/tokens_original/${tokenOriginalId}`);
}

/*
  getFetchTokenHistory
*/

export type ParamsGetFetchTokenHistory = BaseFetchParams & {
  sortBy?: 'id';

  // filters:
  type?: TokenHistoryType[]; //
  tokenOriginalId?: string; // bigint
  tokenNftId?: string; // bigint
  userId?: string; // bigint
  oldOwnerId?: string; // bigint
  tokenChangedOwnerWithUserId: string; // bigint
  lotId?: string; // bigint
  betId?: string; // bitint
};

export function getFetchTokenHistory(params: ParamsGetFetchTokenHistory): FRes<
  TokenHistoryView & {
    TokenOriginal: TokenHistoryView;
    TokenNFT?: TokenNFTView;
    User?: UserView;
    UserOldOwner?: UserView;
    Lot?: LotBetView;
    Bet?: LotBetView;
  }
> {
  return axios.get('/api/market/token_history', { params });
}

/*
  getFetchUserFollowers
*/

export type ParamsGetFetchUserFollowers = BaseFetchParams & {
  sortBy?: 'id';

  // filters:
};

export function getFetchUserFollowers(userId: string, params: ParamsGetFetchUserFollowers): FRes<UserView> {
  return axios.get(`/api/market/users/${userId}/followers`, { params });
}

/*
  getFetchUserFollowings
*/

export type ParamsGetFetchUserFollowings = BaseFetchParams & {
  sortBy?: 'id';

  // filters:
};

// get user fo
export function getFetchUserFollowings(userId: string, params: ParamsGetFetchUserFollowings): FRes<UserView> {
  return axios.get(`/api/market/users/${userId}/followings`, { params });
}
