import * as BN from 'bn.js'
import Web3 from 'web3'
import nftFactoryABI from './abi/ver1/nftABI';
import nftMarketABI from './abi/ver1/nftMarketABI';
import ERC721ABI from './abi/ver1/erc721ABI';
import ERC20ABI from './abi/ver1/erc20ABI';

export interface AtomicMatchParams {
  creator: string;
  creatorReward: number;
  maker: string;
  taker: string;
  isFixedPrice: boolean,
  price: BN;
  extra: BN;
  itemId: BN,
  itemContract: string;
  sellerSignature: string;
  buyerSignature: string;
}

export interface ContractConfig {
  ver: ContractVersion
  main: {
    addresses: {
      factory: string
      marketplace: string
      token: string
    }
    abi: {
      nftFactoryABI: typeof nftFactoryABI
      nftMarketABI: typeof nftMarketABI
      ERC721ABI: typeof ERC721ABI
      ERC20ABI: typeof ERC20ABI
    }
  }
}

export type ContractVersion = 1 | 2

export interface SellerSignatureData {
  orderMaker: string;
  isFixedPrice: boolean;
  price: BN;
  itemId: BN;
  itemContractAddress: string;
}

export interface BuyerSignatureData {
  orderTaker: string;
  isFixedPrice: boolean;
  price: BN;
  extra: BN;
  itemId: BN;
  itemContractAddress: string;
}

type TMethods =
  | 'personal_sign'
  | 'eth_signTypedData_v3'
  | 'eth_requestAccounts'
  | 'wallet_switchEthereumChain'
  | 'wallet_addEthereumChain'

declare global {
  interface Window {
    ethereum?: {
      selectedAddress?: string,
      chainId: string
      networkVersion: string
      request: (data: { method: TMethods; params?: any, from?: any }) => Promise<any>
    }
    web3: Web3
  }
}