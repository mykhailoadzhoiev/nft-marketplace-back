import { AbiItem } from 'web3-utils';

export default [
  {
    inputs: [{ internalType: 'contract IERC20', name: '_paymentToken', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'creator', type: 'address' },
          { internalType: 'address', name: 'maker', type: 'address' },
          { internalType: 'address', name: 'taker', type: 'address' },
          { internalType: 'bool', name: 'isFixedPrice', type: 'bool' },
          { internalType: 'uint256', name: 'price', type: 'uint256' },
          { internalType: 'uint256', name: 'extra', type: 'uint256' },
          { internalType: 'uint256', name: 'itemId', type: 'uint256' },
          { internalType: 'contract IERC721', name: 'itemContract', type: 'address' },
        ],
        indexed: false,
        internalType: 'struct AtomicMatcher.Order',
        name: 'order',
        type: 'tuple',
      },
    ],
    name: 'OrderMatched',
    type: 'event',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'creator', type: 'address' },
          { internalType: 'address', name: 'maker', type: 'address' },
          { internalType: 'address', name: 'taker', type: 'address' },
          { internalType: 'bool', name: 'isFixedPrice', type: 'bool' },
          { internalType: 'uint256', name: 'price', type: 'uint256' },
          { internalType: 'uint256', name: 'extra', type: 'uint256' },
          { internalType: 'uint256', name: 'itemId', type: 'uint256' },
          { internalType: 'contract IERC721', name: 'itemContract', type: 'address' },
        ],
        internalType: 'struct AtomicMatcher.Order',
        name: 'order',
        type: 'tuple',
      },
      { internalType: 'bytes', name: 'buyerSignature', type: 'bytes' },
      { internalType: 'bytes', name: 'sellerSignature', type: 'bytes' },
    ],
    name: 'atomicMatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeTakerAddress1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeTakerAddress2',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeTakerAddress3',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paymentToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as AbiItem[];
