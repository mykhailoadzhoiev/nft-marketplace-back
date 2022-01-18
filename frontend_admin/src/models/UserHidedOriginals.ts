import axios from 'axios';
import { BaseFetchParams } from './types';
import { TRes, FRes } from './types';

/*
  getFecthHiddenOriginals
*/

export type ParamsGetFecthHiddenOriginals = BaseFetchParams & {
  sortBy?: 'id' | 'updatedAt' | 'createdAt';

  // filters:
};

export function getFecthHiddenOriginals(params: ParamsGetFecthHiddenOriginals): FRes<unknown> {
  return axios.get('/api/user/hidden_originals', { params });
}

/*
  postCreateHiddenOriginal
*/

export function postCreateHiddenOriginal(tokenOriginalId: string): TRes<unknown> {
  return axios.post('/api/user/hidden_originals', { tokenOriginalId });
}

/*
  deleteHiddenOriginal
*/

export function deleteHiddenOriginal(tokenOriginalId: string): TRes<unknown> {
  return axios.delete('/api/user/hidden_originals/' + tokenOriginalId);
}
