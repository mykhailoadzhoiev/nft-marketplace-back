import axios from 'axios';
import {
  BaseFetchParams,
  UserView,
  TRes,
  FRes,
  TokenOriginalView,
  LotView,
  TokenNFTView,
  TokenMediaView,
  LotBetView,
  LotStatus,
} from './types';

/*
  getFetchMarketUsers
*/

export type ParamsGetFetchMarketUsers = BaseFetchParams & {
  sortBy?: 'id' | 'name' | 'metaName' | 'createdAt' | 'totalSalesCount';

  // filters:
  id?: string; // bigint
  name?: string; // bigint
};

export function getFetchMarketUsers(params: ParamsGetFetchMarketUsers): FRes<UserView> {
  return axios.get(`/api/market/users`, { params });
}

/*
  getMarketUserById
*/

export function getMarketUserById(userId: string): TRes<
  UserView & {
    followingsCount: number;
    followersCount: number;
  }
> {
  return axios.get(`/api/market/users/${userId}`);
}

/*
  getMarketUserById
*/

export function getMarketUserByMetanameOrId(metanameOrId: string): TRes<
  UserView & {
    followingsCount: number;
    followersCount: number;
  }
> {
  return axios.get(`/api/market/user_by_metaname_or_id/${metanameOrId}`);
}

/*
  getFetchUserTokenOriginalsCreatedByUserId
*/

export type ParamsGetFetchUserTokenOriginalsCreatedByUserId = BaseFetchParams & {
  sortBy?: 'id' | 'updatedAt' | 'createdAt';

  // filters:
  name?: string;
  categoryId?: string; // bigint
};

export function getFetchUserTokenOriginalsCreatedByUserId(
  userId: string,
  params: ParamsGetFetchUserTokenOriginalsCreatedByUserId
): FRes<
  TokenOriginalView & {
    User: UserView;
    Lots: (LotView & {
      User: UserView;
    })[]; // active lots
    TokensNFT: TokenNFTView;
    TokenMedias: TokenMediaView[];
  }
> {
  return axios.get(`/api/market/users/${userId}/token_originals_created`, { params });
}

/*
  getFetchUserTokenOriginalsCollectedByUserId
*/

export type ParamsGetFetchUserTokenOriginalsCollectedByUserId = BaseFetchParams & {
  sortBy?: 'id' | 'updatedAt' | 'createdAt';

  // filters:
  name?: string;
  categoryId?: string; // bigint
};

export function getFetchUserTokenOriginalsCollectedByUserId(
  userId: string,
  params: ParamsGetFetchUserTokenOriginalsCollectedByUserId
): FRes<
  TokenOriginalView & {
    User: UserView;
    Lots: (LotView & {
      User: UserView;
    })[]; // active lots
    TokensNFT: TokenNFTView;
    TokenMedias: TokenMediaView[];
  }
> {
  return axios.get(`/api/market/users/${userId}/token_originals_collected`, { params });
}

/*
  getFeaturedUsers
*/

export function getFeaturedUsers(): TRes<
  (UserView & {
    followingsCount: number;
    followersCount: number;
  })[]
> {
  return axios.get(`/api/market/featured_users`);
}

/*
  getFetchLotsWithBetsByUserId
*/

export type ParamsGetFetchLotsWithBetsByUserId = BaseFetchParams & {
  sortBy?: 'id' | 'updatedAt' | 'createdAt' | 'lastActiveAt';

  // filters:
  status?: LotStatus;
};

export function getFetchLotsWithBetsByUserId(
  userId: string,
  params: ParamsGetFetchLotsWithBetsByUserId
): FRes<
  LotView & {
    User: UserView;
    Bets: LotBetView[]; // target user bets
    TokenOriginal: TokenOriginalView & {
      TokenMedias: TokenMediaView[];
    };
  }
> {
  return axios.get(`/api/market/users/${userId}/with_bets`, { params });
}

/*
  getFetchLotsWithActiveByUserId
*/

export type ParamsGetFetchLotsWithActiveByUserId = BaseFetchParams & {
  sortBy?: 'id' | 'updatedAt' | 'createdAt' | 'lastActiveAt';

  // filters:
  status?: LotStatus;
};

export function getFetchLotsWithActiveByUserId(
  userId: string,
  params: ParamsGetFetchLotsWithActiveByUserId
): FRes<
  LotView & {
    User: UserView;
    Bets: LotBetView[]; // target user bets
    TokenOriginal: TokenOriginalView & {
      TokenMedias: TokenMediaView[];
    };
  }
> {
  return axios.get(`/api/market/users/${userId}/lots_with_active`, { params });
}
