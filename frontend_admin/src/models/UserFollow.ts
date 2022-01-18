import axios from 'axios';
import { TRes } from './types';

/*
  followingPut
*/

export function followingPut(params: {
  userId: string; // bigint // following user id for put
}): TRes<unknown> {
  return axios.post('/api/user/following_put', { params });
}

/*
  followingDelete
*/

export function followingDelete(params: {
  userId: string; // bigint // following user id for delete
}): TRes<unknown> {
  return axios.post('/api/user/following_delete', { params });
}
