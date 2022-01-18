import env, { NodeEnvType } from '@/lib_common/env';
import { TransactionReceipt } from 'web3-core';
import * as BN from 'bn.js';
import { ContractsWrapper, Contracts, createConfig } from './contract_lib/contract';
import { AtomicMatchParams } from './contract_lib/types';
import { Lot } from '@prisma/client';

const Web3 = require('web3');

export interface Account {
  address: string;
}

const isProd = env.NODE_ENV === NodeEnvType.production;
const ConfigV1 = createConfig(isProd, 1);
const ConfigV2 = createConfig(isProd, 2);

let web3;
let MainAcc: Account;
let nftContract;
let marketContract;
let contractWrap: ContractsWrapper;
let contracts: Contracts;

export function getWeb3() {
  return web3;
}

export function getMainAcc() {
  return MainAcc;
}

export function getNftContract() {
  return nftContract;
}

export function getMarketContract() {
  return marketContract;
}

export function getContrractWrap() {
  return contractWrap;
}

export function getChainId() {
  const BSC_MAIN_CHAIN_ID = 56;
  const BSC_TESTNET_CHAIN_ID = 97;
  const chainId = env.NODE_ENV === NodeEnvType.production ? BSC_MAIN_CHAIN_ID : BSC_TESTNET_CHAIN_ID;
  return chainId;
}

export function getTokenAddress() {
  return contracts.addresses.token;
}
export function getNftFactoryAddress() {
  return contracts.addresses.factory;
}
export function getNftMarketplaceAddress() {
  return contracts.addresses.marketplace;
}

export async function initWeb3() {
  web3 = new Web3(new Web3.providers.HttpProvider(env.METAMASK_PROVIDER_URL));

  contracts = new Contracts(ConfigV2, web3);

  MainAcc = web3.eth.accounts.privateKeyToAccount('0x' + env.METAMASK_PRIVATE_KEY);
  web3.eth.accounts.wallet.add(MainAcc);
  web3.eth.defaultAccount = MainAcc.address;

  console.log('MainAcc.address', MainAcc.address);

  const b = await web3.eth.getBalance(MainAcc.address);
  contractWrap = new ContractsWrapper(getChainId(), contracts);

  return web3;
}

export function updateConfigVersion(ver: 1 | 2) {
  if (contracts.contractVersion != ver) {
    contracts.updateConfig(ver === 1 ? ConfigV1 : ConfigV2);
  }
}

type Web3AsyncQueueTask =
  | {
      type: 'createNFT';
      amountOfCopies: number;
      toAddress: string;
    }
  | {
      type: 'sendTo';
      amount: string; // Desimal
      address: string;
    }
  | {
      marketplaceVer: 1 | 2;
      sellerSign: string;
      buyerSign: string;

      type: 'atomicMatch';
      creator: string;
      creatorReward: number;
      maker: string;
      taker: string;
      isFixedPrice: boolean;
      price: string; // // Desimal
      extra: string; // Desimal
      itemId: string; // Desimal tokenId
      itemContract?: string;
    };

async function handleCreateTokensNFT(task: Web3AsyncQueueTask) {
  if (task.type !== 'createNFT') {
    return;
  }

  const amountOfMins = task.amountOfCopies;
  const toAddress = task.toAddress;
  const tokens = await contractWrap.createNewNFT(toAddress, amountOfMins);

  return tokens;
}

async function handleSendTo(task: Web3AsyncQueueTask) {
  if (task.type !== 'sendTo') {
    return;
  }

  const amountBn = new BN(task.amount);
  const address = task.address;

  return await web3.eth.sendTransaction({ from: MainAcc.address, to: address, value: amountBn, gas: '21000' });
}

async function handleAtomicMatch(task: Web3AsyncQueueTask) {
  if (task.type !== 'atomicMatch') {
    return;
  }

  const itemContract = task.itemContract ? task.itemContract : getNftFactoryAddress();

  const atomicParams = {
    buyerSignature: task.buyerSign,
    sellerSignature: task.sellerSign,
    creator: task.creator,
    maker: task.maker,
    taker: task.taker,
    isFixedPrice: task.isFixedPrice,
    itemId: new BN(task.itemId),
    price: new BN(task.price),
    extra: new BN(task.extra),
    itemContract,
  } as AtomicMatchParams;

  if (task.marketplaceVer === 2) {
    atomicParams.creatorReward = task.creatorReward;
  }

  console.log('atomicMatchTask', task);

  updateConfigVersion(task.marketplaceVer);

  const atomicMatchRes = await contractWrap.atomicMatch(atomicParams);

  return atomicMatchRes;
}

class Web3AсyncQueue {
  private inProcess = false;
  private queue = [] as (() => void)[];

  private async handleNext() {
    const next = this.queue.shift();
    if (next) {
      void next();
    } else {
      this.inProcess = false;
    }
  }

  private async handleTask(task: Web3AsyncQueueTask, resolve: (a: any) => any, reject: (a: any) => void) {
    try {
      if (task.type === 'createNFT') {
        const res = await handleCreateTokensNFT(task);
        resolve(res);
      } else if (task.type === 'sendTo') {
        const res = await handleSendTo(task);
        resolve(res);
      } else if (task.type === 'atomicMatch') {
        const res = await handleAtomicMatch(task);
        resolve(res);
      }
    } catch (error) {
      reject(error);
    }
    await this.handleNext();
  }

  async handleQueue<T>(task: Web3AsyncQueueTask): Promise<T> {
    if (!this.inProcess) {
      this.inProcess = true;
      return new Promise(async (resolve, reject) => {
        await this.handleTask(task, resolve, reject);
      });
    } else {
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          await this.handleTask(task, resolve, reject);
        });
      });
    }
  }
}
const web3Queue = new Web3AсyncQueue();

export async function createTokensNFT(params: { amountOfCopies: number; toAddress: string }): Promise<number[]> {
  return await web3Queue.handleQueue({
    type: 'createNFT',
    amountOfCopies: params.amountOfCopies,
    toAddress: params.toAddress,
  });
}

export async function sendTo(amount: string, address: string): Promise<TransactionReceipt> {
  return await web3Queue.handleQueue({
    type: 'sendTo',
    amount,
    address,
  });
}

export interface LocalAtomicMatchParams {
  marketplaceVer: 1 | 2;
  sellerSign: string;
  buyerSign: string;

  creator: string;
  creatorReward: number;
  maker: string;
  taker: string;
  isFixedPrice: boolean;
  price: string; // // Desimal
  extra: string; // Desimal
  itemId: string; // Desimal tokenId
  itemContract?: string;
}

export async function atomicMatch(params: LocalAtomicMatchParams): Promise<void> {
  return await web3Queue.handleQueue({
    type: 'atomicMatch',
    ...params,
  });
}

export async function checkBetAmountBalance(
  betAmount: string,
  metamaskAddress: string,
  lotWrap: {
    lot: Lot;
  },
) {
  const betAmountBn = new BN(betAmount);

  updateConfigVersion(lotWrap.lot.marketplaceVer as 1 | 2);

  const balance = await contractWrap.getBalanceOf(metamaskAddress);
  const balanceBn = new BN(balance);

  if (betAmountBn.lte(balanceBn)) {
    return true;
  }

  return false;
}

export async function checkBetAmountApproval(
  betAmount: string,
  metamaskAddress: string,
  lotWrap: {
    lot: Lot;
  },
) {
  const betAmountBn = new BN(betAmount);

  updateConfigVersion(lotWrap.lot.marketplaceVer as 1 | 2);

  const approval = await contractWrap.getTokensApproval(metamaskAddress, getNftMarketplaceAddress());
  const approvalBn = new BN(approval);

  if (betAmountBn.lte(approvalBn)) {
    return true;
  }

  return false;
}

export async function checkBetAmountFull(betAmount: string, metamaskAddress: string) {
  const betAmountBn = new BN(betAmount);

  const balance = await contractWrap.getBalanceOf(metamaskAddress);
  const balanceBn = new BN(balance);

  const approval = await contractWrap.getTokensApproval(metamaskAddress, getNftMarketplaceAddress());
  const approvalBn = new BN(approval);

  // console.log('checkBetAmountFull');
  // console.log(`betAmount=${betAmount}`);
  // console.log(`userBalance=${balance}`);
  // console.log(`userApproval=${approval}`);
  // console.log(betAmountBn.lte(balanceBn) && betAmountBn.lte(approvalBn));

  if (betAmountBn.lte(balanceBn) && betAmountBn.lte(approvalBn)) {
    return true;
  }

  return false;
}

export async function getTokenURI(contract: string, tokenId: string) {
  return await contractWrap.getTokenURI(contract, new BN(tokenId));
}

export async function isNFTApproved(to: string, tokenId: string, contractAddr: string) {
  return await contractWrap.isNFTApproved(to, new BN(tokenId), contractAddr);
}

export async function getOwnedItems(contractAddress: string, ownerAddress: string) {
  return await contractWrap.getOwnedItems(contractAddress, ownerAddress);
}
