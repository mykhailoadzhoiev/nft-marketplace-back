import axios, { AxiosResponse } from 'axios';
import { UserView, LoginData } from './types';

export function message(metamaskAddress: string): Promise<
  AxiosResponse<{
    isSign: boolean;
    metamaskMessage: string;
  }>
> {
  return axios.get('/api/metamask/message?metamaskAddress=' + metamaskAddress);
}

export function register(
  metamaskAddress: string,
  metamaskMessage: string,
  metamaskSignature: string,
  chainId: string
): Promise<AxiosResponse<LoginData>> {
  return axios.post('/api/metamask/register', {
    metamaskAddress,
    metamaskMessage,
    metamaskSignature,
    chainId,
  });
}

export function login(
  metamaskAddress: string,
  metamaskSignature: string,
  chainId: string
): Promise<AxiosResponse<LoginData>> {
  return axios.post('/api/metamask/login', {
    metamaskAddress,
    metamaskSignature,
    chainId,
  });
}
