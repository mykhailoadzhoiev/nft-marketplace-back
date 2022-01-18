import axios from 'axios';
import {
  BaseFetchParams,
  TRes,
  FRes,
  TokenOriginalView,
  TokenMediaView,
  UserView,
  Task,
  LotTokenView,
  TokenNFTView,
  LotView,
  TokenOriginalStatus,
  UserRole,
  LotStatus,
  MediaType,
} from './types';

export function getContentType(c: TokenMediaView) {
  if (c.isOriginal) {
    return 'Original';
  } else if (c.isWatermark && c.isCensored) {
    return 'Watermark + Censored';
  } else if (c.isPreview && c.isCensored) {
    return 'Preview + Censored';
  } else if (c.isWatermark) {
    return 'Watermark';
  } else if (c.isPreview) {
    return 'Preview';
  }
}

/*
getFetchOrgs
*/

export type ParamsGetFetchOrgs = BaseFetchParams & {
  sortBy?: 'id' | 'expiresAt' | 'lastActiveAt' | 'updatedAt' | 'createdAt' | 'currentCost';

  // filters:
  id?: string; // bigint
  status?: TokenOriginalStatus;
  name?: string; // contains
  userId?: string; // bigint
  categoryId?: string; // bigint
  contentType?: MediaType;
};

export function getFetchOrgs(params: ParamsGetFetchOrgs): FRes<TokenOriginalView> {
  return axios.get('/api/admin/orgs', { params });
}

export function getOrgById(orgId: string): TRes<
  TokenOriginalView & {
    User: UserView;
    Lots: LotView[]; // only active lots
    TokensNFT: TokenNFTView & {
      User: UserView;
    };
    TokenMedias: TokenMediaView[];
  }
> {
  return axios.get(`/api/admin/orgs/${orgId}`);
}

export function orgConfirm(orgId: string): TRes<TokenOriginalView> {
  return axios.post(`/api/admin/orgs/${orgId}/confirm`);
}

export function orgToDraft(orgId: string, moderatorMessage: string): TRes<TokenOriginalView> {
  return axios.post(`/api/admin/orgs/${orgId}/to_draft`, { moderatorMessage });
}

export function orgDelete(orgId: string): TRes<TokenOriginalView> {
  return axios.post(`/api/admin/orgs/${orgId}/delete`);
}

export function orgReProcessing(orgId: string): TRes<TokenOriginalView> {
  return axios.post(`/api/admin/orgs/${orgId}/reprocessing`);
}

/*
  getFetchLots
*/

export type ParamsGetFetchLots = BaseFetchParams & {
  sortBy?: 'id' | 'status' | 'userId' | 'lastActiveAt' | 'updatedAt' | 'currentCost' | 'isTop';

  // filters:
  id?: string; // bigint
  categoryId?: string; // bigint
  userId?: string; // bigint
  status?: LotStatus;
};

export function getFetchLots(params: ParamsGetFetchLots): FRes<
  LotView & {
    User: UserView;
    TokenOriginal: TokenOriginalView & {
      TokenMedias: TokenMediaView;
    };
  }
> {
  return axios.get('/api/admin/lots', { params });
}

/*
  getLotById
*/

export function getLotById(lotId: string): TRes<
  LotView & {
    User: UserView;
    TokenOriginal: TokenOriginalView & {
      TokenMedias: TokenMediaView;
    };
    LotTokens: LotTokenView & {
      TokenNFT: TokenNFTView;
    };
  }
> {
  return axios.get(`/api/admin/lots/${lotId}`);
}

/*
postToggleIsTop
*/

export function postToggleIsTop(lotId: string): TRes<LotView> {
  return axios.post(`/api/admin/lots/${lotId}/toggle_is_top`);
}

/*
postCloseLotAction
*/

export function postCloseLotAction(lotId: string): TRes<LotView> {
  return axios.post(`/api/admin/lots/${lotId}/close_auction`);
}

/*
getFetchUsers
*/

export type ParamsGetFetchUsers = BaseFetchParams & {
  sortBy?: 'id' | 'role' | 'email' | 'name' | 'createdAt' | 'featuredIndex';

  // filters:
  id?: string; // bigint
  email?: string;
  role?: UserRole;
  name?: string; // contains
  metamaskAddress?: string;
  metaName?: string;
  isFeatured?: string;
};

export function getFetchUsers(params: ParamsGetFetchUsers): FRes<UserView> {
  return axios.get('/api/admin/users', { params });
}

/*
  getUserById
*/

export function getUserById(userId: string): TRes<UserView> {
  return axios.get(`/api/admin/users/${userId}`);
}

export function postBanUser(userId: string): TRes<UserView> {
  return axios.post(`/api/admin/users/${userId}/ban`);
}

export function postUnBanUser(userId: string): TRes<UserView> {
  return axios.post(`/api/admin/users/${userId}/unban`);
}

export function postSetFeaturedIndex(userId: string, featuredIndex: number | null): TRes<UserView> {
  return axios.post(`/api/admin/users/${userId}/set_featured_index`, { featuredIndex });
}

/*
getFetchUsers
*/

export type ParamsGetFetchFailTasks = BaseFetchParams & {
  sortBy?: 'id';

  // filters:
};

export function getFetchFailTasks(params: ParamsGetFetchUsers): FRes<Task> {
  return axios.get('/api/admin/fail_tasks', { params });
}

export function postTaskRecover(taskId: string): TRes<Task> {
  return axios.post(`/api/admin/fail_tasks/${taskId}`);
}

export function deleteTask(taskId: string): TRes<unknown> {
  return axios.delete(`/api/admin/fail_tasks/${taskId}`);
}
