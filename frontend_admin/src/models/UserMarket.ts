import axios from 'axios';
import { BaseFetchParams, TokenNFTView, TokenOriginalView, LotBetView, TokenMediaView, LotStatus } from './types';
import { LotView, UserView, TRes, FRes } from './types';

/*
  getFetchUserLots
*/

export type ParamsGetFetchUserLots = BaseFetchParams & {
  sortBy?: 'id' | 'lastActiveAt' | 'currentCost';

  // filters:
  name?: string;
  categoryId?: string; // bigint
};

export function getFetchUserLots(params: ParamsGetFetchUserLots): FRes<
  LotView & {
    User: UserView;
    TokenOriginal: TokenOriginalView & {
      TokenMedias: TokenMediaView[];
    };
  }
> {
  return axios.get('/api/user/lots', { params });
}

/*
  getFetchUserLotsWithBets
*/

export type ParamsGetFetchUserLotsWithBets = BaseFetchParams & {
  sortBy?: 'id' | 'updatedAt' | 'createdAt' | 'lastActiveAt';

  // filters:
  status?: LotStatus;
};

export function getFetchUserLotsWithBets(params: ParamsGetFetchUserLotsWithBets): FRes<
  LotView & {
    User: UserView;
    Bets: LotBetView[]; // this user bets
    TokenOriginal: TokenOriginalView & {
      TokenMedias: TokenMediaView[];
    };
  }
> {
  return axios.get('/api/user/lots/with_bets', { params });
}

/*
  getFetchUserLotsWithActive
*/

export type ParamsGetFetchUserLotsWithActive = BaseFetchParams & {
  sortBy?: 'id' | 'updatedAt' | 'createdAt' | 'lastActiveAt';

  // filters:
  status?: LotStatus;
};

export function getFetchUserLotsWithActive(params: ParamsGetFetchUserLotsWithActive): FRes<
  LotView & {
    User: UserView;
    Bets: LotBetView[]; // this user bets
    TokenOriginal: TokenOriginalView & {
      TokenMedias: TokenMediaView[];
    };
  }
> {
  return axios.get('/api/user/lots/with_active', { params });
}

/*
  getUserLotById
*/

export function getUserLotById(lotId: string): TRes<
  LotView & {
    User: UserView;
    TokenOriginal: TokenOriginalView & {
      TokenMedias: TokenMediaView[];
    };
  }
> {
  return axios.get(`/api/user/lots/${lotId}`);
}

/*
  getFetchUserBets
*/

export type ParamsFetchUserBets = BaseFetchParams & {
  sortBy?: 'id' | 'createdAt' | 'betAmount' | 'lotId';

  // filters:
  lotId: string; // bigint
};

export function getFetchUserBets(params: ParamsFetchUserBets): FRes<
  LotBetView & {
    EftToken?: TokenNFTView; // win eft token
  }
> {
  return axios.get('/api/user/bets', { params });
}

/*
  getFetchUserTokens
*/

export type FetchUserTokensParams = BaseFetchParams & {
  sortBy?: 'id' | 'token' | 'createdAt';

  // filters:
};

export function getFetchUserTokens(params: FetchUserTokensParams): FRes<TokenNFTView> {
  return axios.get('/api/user/tokens', { params });
}
