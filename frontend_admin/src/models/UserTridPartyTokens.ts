import axios from 'axios';
import { TRes } from './types';

/*
  getUserTridPartyTokens
*/

export function getUserTridPartyTokens(params: {
  marketAddr?: string; // market addr optional filter
}): TRes<{
  [marketAddr: string]: string[]; // [marketAddr]: token[]
}> {
  return axios.get('/api/user/trid_party_tokens', { params });
}

/*
  getOwnedItems
*/

export function getOwnedItems(args: { contractAddress: string; ownerAddress: string }): TRes<
  {
    id: string;
    metadata: string;
  }[]
> {
  return axios.get('/api/user/get_owned_items', { params: args });
}
