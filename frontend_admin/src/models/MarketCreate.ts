import axios, { AxiosResponse } from 'axios';
import { createFormGenerator } from '../lib/form';
import { reactive } from 'vue';
import {
  MediaType,
  LotView,
  TRes,
  UserView,
  TokenOriginalView,
  TokenMediaView,
  LotTokenView,
  TokenNFTView,
  LotSaleType,
} from './types';

export type CreatorRewardValue = 0 | 5 | 10 | 15;

export const formCreateNewOriginal = createFormGenerator<
  {
    name: string;
    description: string;
    isUseCensored: boolean;
    contentType: MediaType;
    copiesTotal: number; // min 1, max 10
    isCommercial: boolean;
    creatorReward: CreatorRewardValue;
  },
  TokenOriginalView
>(
  () => {
    return reactive({
      name: '',
      description: '',
      isUseCensored: false,
      contentType: MediaType.IMAGE,
      copiesTotal: 1,
      isCommercial: false,
      creatorReward: 10 as CreatorRewardValue,
    });
  },
  (model) => {
    return axios.post('/api/market_create/original', model);
  }
);

export const formUpdateDraftOrg = createFormGenerator<
  {
    orgId: string; // hidden (only for request)
    name: string;
    description: string;
    isUseCensored: boolean;
    contentType: MediaType;
    copiesTotal: number; // min 1, max 10
    isCommercial: boolean;
    creatorReward: CreatorRewardValue;
  },
  TokenOriginalView
>(
  () => {
    return reactive({
      orgId: '',
      name: '',
      description: '',
      isUseCensored: false,
      contentType: MediaType.IMAGE,
      copiesTotal: 1,
      isCommercial: false,
      creatorReward: 10 as CreatorRewardValue,
    });
  },
  (model) => {
    return axios.post(`/api/market_create/original/${model.orgId}/update_draft`, model);
  }
);

/**
 * @deprecated use uploadOrgContent
 */
export function uploadOrgMediaImage(orgId: string, imageFile: File): TRes<{ code: number }> {
  const formData = new FormData();
  formData.append('image_file', imageFile);
  return axios.post(`/api/market_create/original/${orgId}/upload_image`, formData);
}
/**
 * @deprecated use uploadOrgContent
 */
export function uploadOrgMediaVideo(orgId: string, videoFile: File): TRes<{ code: number }> {
  const formData = new FormData();
  formData.append('video_file', videoFile);
  return axios.post(`/api/market_create/original/${orgId}/upload_video`, formData);
}

export function uploadOrgContent(orgId: string, file: File): TRes<{ code: number; message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post(`/api/market_create/original/${orgId}/upload`, formData);
}

export function draftComplete(orgId: string): Promise<AxiosResponse<TokenOriginalView>> {
  return axios.post(`/api/market_create/original/${orgId}/draft_complete`);
}

export const formCreateLot = createFormGenerator<
  {
    saleType: LotSaleType;
    tokenOriginalId: string;
    minimalCost: string; // Desimal
    expiresOffsetSec: number | null;
    sellerSignsData: {
      tokenNftId: string;
      sign: string;
    }[];
    marketplaceVer: 1 | 2;
  },
  LotView & {
    User: UserView;
    TokenOriginal: TokenOriginalView & {
      TokenMedias: TokenMediaView[];
    };
    LotTokens: LotTokenView & {
      TokenNFT: TokenNFTView;
    };
  }
>(
  () => {
    return reactive({
      saleType: LotSaleType.AUCTION,
      tokenOriginalId: '',
      minimalCost: '0',
      expiresOffsetSec: null,
      sellerSignsData: [],
      marketplaceVer: 2,
    });
  },
  (model) => {
    return axios.post(`/api/market_create/lot`, model);
  }
);

export const formUpdateAuctionLot = createFormGenerator<
  {
    lotId: string; // bigint
    expiresOffsetSec: Date | null; // Date = string of date format
  },
  LotView & {
    User: UserView;
    TokenOriginal: TokenOriginalView & {
      TokenMedias: TokenMediaView[];
    };
    LotTokens: LotTokenView & {
      TokenNFT: TokenNFTView;
    };
  }
>(
  () => {
    return reactive({
      lotId: '0',
      expiresOffsetSec: null,
    });
  },
  (model) => {
    return axios.post(`/api/market_create/lot_update`, model);
  }
);

/*
  importToken
*/
export function importToken(data: {
  name: string;
  description: string;
  isUseCensored: boolean;
  copiesTotal: number; // min 1, max 10
  isCommercial: boolean;
  creatorReward: CreatorRewardValue;
  image: string;
  contract: string;
  tokenId: string;
}): TRes<TokenOriginalView> {
  return axios.post(`/api/market_create/import`, data);
}
