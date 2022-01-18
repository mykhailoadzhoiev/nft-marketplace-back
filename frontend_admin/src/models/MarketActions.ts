import axios, { AxiosResponse } from 'axios';
import { LotView, LotBetView, TokenNFTView, TRes } from './types';

/*
  postPlaceABet
*/

export type PlaceABetParams = {
  lotId: string; // bigint
  betAmount: string; // Desimal
  buyerSignsData: {
    tokenNftId: string;
    sign: string;
  }[];
};

export function postPlaceABet(placeAbetParams: PlaceABetParams): TRes<LotBetView> {
  return axios.post(`/api/market_actions/place_a_bet`, placeAbetParams);
}

/*
  postBetCancel
*/

export type ParamsPostBetCancel = {
  lotBetId: string; // bigint
};

export function postBetCancel(params: ParamsPostBetCancel): TRes<LotBetView> {
  return axios.post(`/api/market_actions/cancel_bet`, params);
}

/*
  postCloseLotAction
*/

export type CloseLotAuctionParams = {
  lotId: string; // bigint // bet id
};

export function postCloseLotAction(closeLotAuctionParams: CloseLotAuctionParams): TRes<LotView> {
  return axios.post(`/api/market_actions/close_lot_action`, closeLotAuctionParams);
}

/*
  buyLotToken
*/

export type BuyLotTokenParams = {
  lotId: string; // bigint
  tokenNftId: string; // bigint
  buyerSignData: string; // for tokenNftId
};

export function buyLotToken(buyLotTokenParams: BuyLotTokenParams): TRes<LotView> {
  return axios.post(`/api/market_actions/buy_lot_token`, buyLotTokenParams);
}
