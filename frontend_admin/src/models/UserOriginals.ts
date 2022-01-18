import axios from 'axios';
import { BaseFetchParams, TokenNFTView, TokenOriginalView, TokenMediaView } from './types';
import { LotView, UserView, TRes, FRes } from './types';

/*
  getFetchUserCreatedTokensOriginal
*/

export type ParamsGetFetchUserCreatedTokensOriginal = BaseFetchParams & {
  sortBy?: 'id' | 'name' | 'updatedAt' | 'createdAt';

  // filters:
  name?: string;
  categoryId?: string; // bigint
};

export function getFetchUserCreatedTokensOriginal(params: ParamsGetFetchUserCreatedTokensOriginal): FRes<
  TokenOriginalView & {
    User: UserView;
    Lots: (LotView & {
      User: UserView;
    })[]; // active lots
    TokensNFT: TokenNFTView & {
      User: UserView;
    };
    TokenMedias: TokenMediaView[];
  }
> {
  return axios.get('/api/user/tokens_original/created', { params });
}

/*
  getFecthUserCollectedTokensOrigina
*/

export type ParamsGetFecthUserCollectedTokensOrigina = BaseFetchParams & {
  sortBy?: 'id' | 'name' | 'updatedAt' | 'createdAt';

  // filters:
  name?: string;
  categoryId?: string; // bigint
};

export function getFecthUserCollectedTokensOrigina(params: ParamsGetFecthUserCollectedTokensOrigina): FRes<
  TokenOriginalView & {
    User: UserView;
    Lots: (LotView & {
      User: UserView;
    })[]; // active lots
    TokensNFT: TokenNFTView & {
      User: UserView;
    };
    TokenMedias: TokenMediaView[];
  }
> {
  return axios.get('/api/user/tokens_original/collected', { params });
}

/*
  deleteTokenOriginalById
*/

export function deleteTokenOriginalById(lotId: string): TRes<string> {
  return axios.delete(`/api/user/tokens_original/${lotId}`);
}
