import Web3 from 'web3';
import * as Web3Utils from 'web3-utils';
import { Contract } from 'web3-eth-contract';
import Moralis from 'moralis/node';
import './types';
import * as BN from 'bn.js';

import nftFactoryABI_ver1 from './abi/ver1/nftABI';
import nftMarketABI_ver1 from './abi/ver1/nftMarketABI';
import ERC721ABI_ver1 from './abi/ver1/erc721ABI';
import ERC20ABI_ver1 from './abi/ver1/erc20ABI';

import nftMarketABI_ver2 from './abi/ver2/nftMarketABI';

import { ContractConfig, AtomicMatchParams, BuyerSignatureData, SellerSignatureData, ContractVersion } from './types';

/**
 * Get all the addresses
 * @param isProd is production?
 * @param ver is contract's version
 * @returns {ContractConfig}
 */
export function createConfig(isProd: boolean, ver: ContractVersion): ContractConfig {
  const versions: ContractConfig[] = [
    {
      ver: 1,
      main: {
        addresses: isProd
          ? {
              factory: '0x927544797465e9e6Ec0F5023E6A0e8710e7Eb233',
              marketplace: '0x9d5fA48cbc0694d6F2Eebe1b70926fce071D51EB',
              token: '0xdb238123939637d65a03e4b2b485650b4f9d91cb',
            }
          : {
              factory: '0x55dC2dB4B108E0EF441e51CA6CA3a521D82b2a89',
              marketplace: '0x0Bc5883b7166963B14BfDc1dDa3f2F916fbC25a0',
              token: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
            },
        abi: {
          nftFactoryABI: nftFactoryABI_ver1,
          nftMarketABI: nftMarketABI_ver1,
          ERC20ABI: ERC20ABI_ver1,
          ERC721ABI: ERC721ABI_ver1,
        },
      },
    },
    {
      ver: 2,
      main: {
        addresses: isProd
          ? {
              factory: '0x927544797465e9e6Ec0F5023E6A0e8710e7Eb233',
              marketplace: '0x53d503E57726485f7428061426643594afCc6F26',
              token: '0xdb238123939637d65a03e4b2b485650b4f9d91cb',
            }
          : {
              factory: '0x55dC2dB4B108E0EF441e51CA6CA3a521D82b2a89',
              marketplace: '0x0Bc5883b7166963B14BfDc1dDa3f2F916fbC25a0',
              token: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
            },
        abi: {
          nftFactoryABI: nftFactoryABI_ver1,
          nftMarketABI: nftMarketABI_ver2,
          ERC20ABI: ERC20ABI_ver1,
          ERC721ABI: ERC721ABI_ver1,
        },
      },
    },
  ];

  return versions.find((v) => v.ver === ver)!;
}

export class Contracts {
  public nftFactory!: Contract;
  public nftMarketplace!: Contract;
  public tasteToken!: Contract;

  constructor(private config: ContractConfig, public web3: Web3) {
    this.updateConfig(config);
  }

  public updateConfig = (config: ContractConfig) => {
    this.config = config;
    this.nftFactory = new this.web3.eth.Contract(this.abi.nftFactoryABI, this.addresses.factory);
    this.nftMarketplace = new this.web3.eth.Contract(this.abi.nftMarketABI, this.addresses.marketplace);
    this.tasteToken = new this.web3.eth.Contract(this.abi.ERC20ABI, this.addresses.token);
    return this;
  };

  public updateWeb3 = (web3: Web3) => {
    this.web3 = web3;
    return this;
  };

  get abi() {
    return this.config.main.abi;
  }

  get addresses() {
    return this.config.main.addresses;
  }

  get contractVersion() {
    return this.config.ver;
  }
}
/**
 *
 */
export class ContractsWrapper {
  constructor(private chainId: number, private contracts: Contracts) {}

  get contractVersion() {
    return this.contracts.contractVersion;
  }

  getNFTContract = (address: string): Contract => {
    return new this.contracts.web3.eth.Contract(this.contracts.abi.nftFactoryABI, address);
  };

  getTokenOwner = async (tokenId: BN): Promise<string> => {
    return await this.contracts.nftFactory.methods.ownerOf(tokenId).call();
  };

  /**
   * Mints new NFTs
   * @param to Recipient of NFT
   * @param amountOfCopies Amount of tokens to mint
   * @returns NFT ids
   */
  createNewNFT = async (to: string, amountOfCopies: number = 1): Promise<number[]> => {
    const receipt = await this.contracts.nftFactory.methods
      .mint(amountOfCopies, to)
      .send({ from: this.contracts.web3.eth.defaultAccount, gas: 2000000 });
    return receipt.events.TokensMined.returnValues[0];
  };

  /**
   * Returns domain data to create typed signature for eth_signTypedData_v4
   * @returns
   */
  private getDomainData = () => {
    return {
      name: 'TASTE NFT Marketplace',
      version: '1',
      chainId: this.chainId,
      verifyingContract: this.contracts.nftMarketplace.options.address,
    };
  };

  getOwnedItems = async (
    contractAddress: string,
    ownerAddress: string,
  ): Promise<{ id: string; metadata: string | undefined }[]> => {
    const account = Web3Utils.toChecksumAddress(ownerAddress);
    const serverUrl = 'https://0tpk0tx9aut4.usemoralis.com:2053/server';
    const appId = '9wIjTbFng57QQwY8vQdhbmCUBgSZI7RunWNVd3h2';

    Moralis.start({ serverUrl, appId });
    const options = { chain: 'bsc' as const, address: account, token_address: contractAddress };
    const nfts = await Moralis.Web3API.account.getNFTsForContract(options);

    const formattedResult = nfts.result?.map((token) => {
      return { id: token.token_id, metadata: token.metadata };
    });

    return formattedResult ? formattedResult : [];
  };

  getTokenURI = async (contractAddress: string, tokenId: BN): Promise<string> => {
    const token = this.getNFTContract(contractAddress);
    return await token.methods.tokenURI(tokenId).call();
  };

  /**
   * Creates seller signature. Should be called from frontend before NFT approval
   * @param sellerSignatureData Seller data to sign
   * @returns Seller signature
   */
  createSellerSignature = async (params: SellerSignatureData) => {
    const { orderMaker, isFixedPrice, price, itemId, itemContractAddress } = params;

    const sellerData = this.contracts.web3.utils.soliditySha3(
      orderMaker,
      isFixedPrice,
      price,
      itemId,
      itemContractAddress,
    );

    const sellerSignature = await window.ethereum?.request({
      method: 'personal_sign',
      params: [window.ethereum.selectedAddress, sellerData],
      from: window.ethereum.selectedAddress,
    });

    return sellerSignature;
  };

  /**
   * Creates buyer signature. Should be called from frontend before TASTE tokens approval
   * @param buyerSignatureData
   * @returns
   */
  createBuyerSignature = async (params: BuyerSignatureData) => {
    const { orderTaker, isFixedPrice, price, extra, itemId, itemContractAddress } = params;
    const buyerData = this.contracts.web3.utils.soliditySha3(
      orderTaker,
      isFixedPrice,
      price,
      extra,
      itemId,
      itemContractAddress,
    );

    let buyerSignature = await window.ethereum?.request({
      method: 'personal_sign',
      params: [window.ethereum.selectedAddress, buyerData],
      from: window.ethereum.selectedAddress,
    });

    return buyerSignature;
  };

  atomicMatch = async (params: AtomicMatchParams) => {
    const order = {
      creator: params.creator,
      creatorReward: params.creatorReward,
      maker: params.maker,
      taker: params.taker,
      isFixedPrice: params.isFixedPrice,
      price: params.price.toString(),
      extra: params.extra.toString(),
      itemId: params.itemId.toString(),
      itemContract: params.itemContract,
    };

    return await this.contracts.nftMarketplace.methods
      .atomicMatch(order, params.buyerSignature, params.sellerSignature)
      .send({ from: this.contracts.web3.eth.defaultAccount, gas: 2000000 });
  };

  approveTokens = async (from: string, amount: BN, to: string) => {
    return await this.contracts.tasteToken.methods.approve(to, amount).send({ from: from, gas: 120000 });
  };

  approveNFT = async (from: string, tokenId: BN, to: string, contractAddress?: string) => {
    if (contractAddress) {
      const nftContract = this.getNFTContract(contractAddress);
      return await nftContract.methods.approve(to, tokenId).send({ from: from, gas: 120000 });
    }

    return await this.contracts.nftFactory.methods.approve(to, tokenId).send({ from: from, gas: 120000 });
  };

  getBalanceOf = async (owner: string) => {
    return await this.contracts.tasteToken.methods.balanceOf(owner).call();
  };

  getTokensApproval = async (from: string, to: string) => {
    return await this.contracts.tasteToken.methods.allowance(from, to).call();
  };

  isNFTApproved = async (to: string, tokenId: BN, contractAddress?: string) => {
    if (contractAddress) {
      const nftContract = this.getNFTContract(contractAddress);
      const approvedAddress = await nftContract.methods.getApproved(tokenId).call();
      return approvedAddress == to;
    }

    const approvedAddress = await this.contracts.nftFactory.methods.getApproved(tokenId).call();
    return approvedAddress == to;
  };
}
