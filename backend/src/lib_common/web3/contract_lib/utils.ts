export const AddressZero = "0x0000000000000000000000000000000000000000"

export const SellType = [
  { name: 'seller', type: 'address' },
  { name: 'fixed price', type: 'bool' },
  { name: 'price', type: 'uint256' },
  { name: 'token ID', type: 'uint256' },
  { name: 'NFT contract address', type: 'address' }
]

export const BuyType = [
  { name: 'buyer', type: 'address' },
  { name: 'fixed price', type: 'bool' },
  { name: 'price', type: 'uint256' },
  { name: 'extra', type: 'uint256' },
  { name: 'token ID', type: 'uint256' },
  { name: 'NFT contract address', type: 'address' }
]

export const DomainType = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
  { name: "salt", type: "bytes32" },
]