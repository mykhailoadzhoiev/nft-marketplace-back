import { AxiosResponse } from 'axios';

export type BaseFetchParams = {
  page?: string; // number
  pageSize?: string; // number
  sortBy?: string; // sort params
  sortDesc?: string; // boolean (0,false,1,true)
};

export type BaseFetchResult<T> = {
  page: number;
  pageSize: number;
  rows: T[];
  totalRows: number;
  sortBy: string;
  sortDesc: boolean;
};

export type TRes<T> = Promise<AxiosResponse<T>>;
export type FRes<F> = Promise<AxiosResponse<BaseFetchResult<F>>>;

export interface LotBetView {
  id: string;
  lotId: string;
  userId: string;
  eftTokenId: string;
  betAmount: string;
  isWin: boolean;
  createdAt: Date;
  updatedAt: Date;
  isCancel: boolean;

  Lot?: LotView;
  User?: UserView;
  TokenNFT?: TokenNFTView;
}
export interface TokenNFTView {
  id: string;
  userId: string;
  tokenOriginalId: string;
  token: string;
  index: number;
  currentLotId: string | null;
  createdAt: Date;

  User?: UserView;
  TokenOriginal?: TokenOriginalView;
  CurrentLot?: LotView | null;
  LotTokens?: LotTokenView[];
  LotBets?: LotBetView[];
}

export enum LotSaleType {
  AUCTION = 'AUCTION',
  SALE = 'SALE',
}

export enum LotStatus {
  IN_SALES = 'IN_SALES',
  CLOSED = 'CLOSED',
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
}

export type TokenMediaView = {
  lotId: string;
  sha256: string;
  type: MediaType;
  mime: string;
  isOriginal: boolean;
  isConverted: boolean;
  isPreview: boolean;
  isCensored: boolean;
  isWatermark: boolean;
};

export type LotContentData = {
  sha256: string; // sha256 for route: /sha256/:sha256
  type: MediaType;
};

export enum TokenOriginalType {
  LOCAL = 'LOCAL',
  IMPORT = 'IMPORT',
}

export enum TokenOriginalStatus {
  BAN = 'BAN',
  DRAFT = 'DRAFT',
  IMPORT_TASK = 'IMPORT_TASK',
  IMPORT_FAIL = 'IMPORT_FAIL',
  VALIDATION = 'VALIDATION',
  TASK = 'TASK',
  PUBLISHED = 'PUBLISHED',
}

export type TokenOriginalView = {
  id: string;
  type: TokenOriginalType;
  status: TokenOriginalStatus;
  userId: string;
  contentType: MediaType;
  categoryId: string | null;
  isUseCensored: boolean;
  name: string;
  description: string;
  moderatorMessage: string | null;
  copiesTotal: number;
  createdAt: Date;
  updatedAt: Date;
  isCommercial: boolean;
  creatorReward: number;
  importAddr: null | string;
  importTokenId: null | string;

  User?: UserView;
  TokensNFT?: TokenNFTView[];
  TokenMedias?: TokenMediaView[];
  Lots?: LotView[];
};

export type LotTokenView = {
  id: string;
  lotId: string;
  tokenNftId: string;
  isSold: boolean;
  isProcessin: boolean;

  Lot?: LotView;
  TokenNFT?: TokenNFTView;
};

export type LotView = {
  id: string;
  saleType: LotSaleType;
  userId: string;
  status: LotStatus;
  tokenOriginalId: string;
  minimalCost: string;
  currentCost: string;
  copiesSold: number;
  copiesTotal: number;
  expiresAt: Date | null;
  lastActiveAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  isTop: boolean;
  marketplaceVer: number;

  User?: UserView;
  TokenOriginal?: TokenOriginalView;
  Bets?: LotBetView[];
  LotTokens?: LotTokenView[];
};

export interface LoginData {
  token: string;
  refreshToken: string;
  expirationTs: number;
  user: UserView & { balance: string; followingsCount: number; followersCount: number };
}

export enum UserRole {
  Guest = 'GUEST',
  User = 'USER',
  Moderator = 'MODERATOR',
  Admin = 'ADMIN',
}

export interface UserToUserView {
  id: string;
  userId: string; // following user id
  followerId: string; // follower user id
}
export interface UserView {
  id: string;
  role: UserRole;
  email: string;
  metaName: string | null;
  name: string;
  description: string;
  socialTwitch: string;
  socialInstagram: string;
  socialTwitter: string;
  socialOnlyfans: string;
  avatar: string | null; // sha256 for route: /sha256/:sha256
  background: string | null; // sha256 for route: /sha256/:sha256
  createdAt: string; // Date
  isActivated: boolean;
  metamaskAddress: string;
  totalSalesCount: number;
  totalSalesProfit: string; // decimal

  // special
  isFollowing: null | boolean; // null === unknown
  followingsCount?: number;
  followersCount?: number;

  // for admin
  featuredIndex?: number | null;

  // relations
  Folls?: UserToUserView[];
}

export enum TokenHistoryType {
  ORG_PUBLISHED = 'ORG_PUBLISHED',
  LOT_CREATED = 'LOT_CREATED',
  LOT_CLOSED = 'LOT_CLOSED',
  LOT_BET_CREATED = 'LOT_BET_CREATED',
  LOT_BET_CANCEL = 'LOT_BET_CANCEL',
  NFT_TOKEN_ADDED = 'NFT_TOKEN_ADDED',
  NFT_TOKEN_PUT_UP_FOR_SALE = 'NFT_TOKEN_PUT_UP_FOR_SALE',
  NFT_TOKEN_CHANGED_OWNER_BET = 'NFT_TOKEN_CHANGED_OWNER_BET',
  NFT_TOKEN_CHANGED_OWNER_SALE = 'NFT_TOKEN_CHANGED_OWNER_SALE',
}

export interface TokenHistoryView {
  id: string;
  type: TokenHistoryType;
  tokenOriginalId: string;
  tokenNftId: string | null;
  userId: string | null;
  lotId: string | null;
  betId: string | null;
  buyPrice: string | null; // Desimal (wei) // NFT_TOKEN_PUT_UP_FOR_SALE, NFT_TOKEN_CHANGED_OWNER_SALE
  createdAt: Date;
  updatedAt: Date;

  TokenOriginal?: TokenOriginalView; // ALL TYPES
  TokenNFT?: TokenNFTView; // ALL NFT TOKEN TYPES
  User?: UserView; // NFT_TOKEN_ADDED, NFT_TOKEN_PUT_UP_FOR_SALE, NFT_TOKEN_CHANGED_OWNER_BET
  Lot?: LotView; // ALL LOT TYPES
  Bet?: LotBetView; // NFT_TOKEN_PUT_UP_FOR_SALE
}

export interface Task {
  id: string;
  type: string;
  data: string;
  failAt: Date;
  errorText: string;
}
