import prisma from '@/lib_db/prisma';
import { LotRow, SignsData } from '../../lib_db/models/Lot';
import { LotStatus, Prisma, TokenHistoryType, LotSaleType } from '@prisma/client';
import * as Web3Lib from '@/lib_common/web3';
import * as moment from 'moment';

export interface TaskDataLotClose {
  lotId: string;
}

async function auctionLotSalesOnClose(lot: LotRow) {
  const lotBets = await prisma.lotBet.findMany({
    where: {
      lotId: lot.id,
      isCancel: false,
    },
    orderBy: {
      betAmount: 'desc',
    },
    include: {
      User: true,
    },
  });

  const lotTokens = await prisma.lotToken.findMany({
    where: {
      lotId: lot.id,
      isSold: false,
    },
    include: {
      TokenNFT: true,
    },
  });

  const sellerSignsData = lot.sellerSignsData as any as SignsData[];
  let basePrice = lot.minimalCost;
  if (basePrice.eq(0)) {
    basePrice = new Prisma.Decimal(1);
  }

  let tokenIndex = 0;
  for (let index = 0; index < lotBets.length; index++) {
    const bet = lotBets[index];
    const lotToken = lotTokens[tokenIndex];

    if (!lotToken || !bet) {
      break;
    }

    const isGoodBet = await Web3Lib.checkBetAmountFull(bet.betAmount.toFixed(), bet.User.metamaskAddress);
    // console.log('isGoodBet', isGoodBet, !!bet, !!lotToken, index, tokenIndex);
    if (!isGoodBet) {
      continue;
    }

    if (lotToken) {
      const buyerSignsData = bet.buyerSignsData as any as SignsData[];
      const sellerSignData = sellerSignsData.find((v: SignsData) => v.tokenNftId === lotToken.TokenNFT.id.toString());
      const buyerSignData = buyerSignsData.find((v: SignsData) => v.tokenNftId === lotToken.TokenNFT.id.toString());

      const atomiMatchParams = {
        marketplaceVer: lot.marketplaceVer as 1,

        sellerSign: sellerSignData.sign,
        buyerSign: buyerSignData.sign,

        creator: lot.TokenOriginal.User.metamaskAddress,
        creatorReward: lot.TokenOriginal.creatorReward,
        maker: lot.User.metamaskAddress,
        taker: bet.User.metamaskAddress,
        price: basePrice.toFixed(),
        extra: bet.betAmount.minus(basePrice).toFixed(),
        isFixedPrice: false,
        itemId: lotToken.TokenNFT.token,
      } as Web3Lib.LocalAtomicMatchParams;

      try {
        await Web3Lib.atomicMatch(atomiMatchParams);

        await prisma.$transaction([
          prisma.user.update({
            where: {
              id: lot.userId,
            },
            data: {
              totalSalesCount: {
                increment: 1,
              },
              totalSalesProfit: {
                increment: bet.betAmount.toFixed(),
              },
            },
          }),
          prisma.lotBet.update({
            where: {
              id: bet.id,
            },
            data: {
              isWin: true,
              tokenNftId: lotToken.tokenNftId,
            },
          }),
          prisma.lotToken.update({
            where: {
              id: lotToken.id,
            },
            data: {
              isSold: true,
            },
          }),
          prisma.lot.update({
            where: {
              id: lot.id,
            },
            data: {
              lastActiveAt: moment().toISOString(),
              copiesSold: {
                increment: 1,
              },
            },
          }),
          prisma.tokenNFT.update({
            where: {
              id: lotToken.tokenNftId,
            },
            data: {
              userId: bet.userId,
              currentLotId: null,
            },
          }),
          prisma.tokenHistory.create({
            data: {
              type: TokenHistoryType.NFT_TOKEN_CHANGED_OWNER_BET,
              tokenOriginalId: lot.TokenOriginal.id,
              tokenNftId: lotToken.tokenNftId,
              userId: bet.userId,
              lotId: lot.id,
              betId: bet.id,

              oldOwnerId: lot.userId,
              buyPrice: bet.betAmount.toFixed(),
            },
          }),
        ]);
      } catch (error) {
        console.error(error);
      }

      tokenIndex++;
    }
  }

  let topWinBetId = null;
  const topWinBet = await prisma.lotBet.findFirst({
    where: {
      lotId: lot.id,
      isWin: true,
    },
    orderBy: {
      betAmount: 'desc',
    },
  });
  if (topWinBet) {
    topWinBetId = topWinBet.id;
  }

  await prisma.tokenHistory.create({
    data: {
      type: TokenHistoryType.LOT_CLOSED,
      tokenOriginalId: lot.TokenOriginal.id,
      lotId: lot.id,
      betId: topWinBetId,
      userId: lot.userId,
    },
  });
}

export async function taskWorkLotClose(taskData: TaskDataLotClose) {
  const lot = await prisma.lot.findFirst({
    where: {
      id: BigInt(taskData.lotId),
    },
    include: {
      TokenOriginal: {
        include: {
          User: true,
        },
      },
      User: true,
    },
  });

  if (lot.saleType === LotSaleType.AUCTION) {
    await auctionLotSalesOnClose(lot);
  }

  await prisma.tokenNFT.updateMany({
    where: {
      currentLotId: lot.id,
    },
    data: {
      currentLotId: null,
    },
  });
}

export interface TaskDataBuyTokenNft {
  userId: string;
  lotId: string;
  lotTokenId: string;
  tokenNftId: string;
  buyerSignData: string;
}

export async function taskWorkLotTokenNftBuy(taskData: TaskDataBuyTokenNft) {
  const lotId = BigInt(taskData.lotId);
  const tokenNftId = BigInt(taskData.tokenNftId);
  const buyerSignData = taskData.buyerSignData;

  const buyerUser = await prisma.user.findUnique({
    where: {
      id: BigInt(taskData.userId),
    },
  });
  const lot = await prisma.lot.findUnique({
    where: {
      id: lotId,
    },
    include: {
      User: true,
      TokenOriginal: {
        include: {
          User: true,
        },
      },
    },
  });
  const lotToken = await prisma.lotToken.findUnique({
    where: {
      id: BigInt(taskData.lotTokenId),
    },
  });
  const tokenNft = await prisma.tokenNFT.findUnique({
    where: {
      id: tokenNftId,
    },
  });

  const sellerSignsData = lot.sellerSignsData as any as SignsData[];
  const sellerSignData = sellerSignsData.find((v) => {
    return v.tokenNftId === taskData.tokenNftId;
  });

  if (!sellerSignData) {
    throw new Error('seller sign data not found');
  }

  const buyPriceFixed = lot.currentCost.toFixed();
  const isGoodBet = await Web3Lib.checkBetAmountFull(buyPriceFixed, buyerUser.metamaskAddress);
  if (!isGoodBet) {
    return;
  }

  const atomiMatchParams = {
    marketplaceVer: lot.marketplaceVer as 1 | 2,

    sellerSign: sellerSignData.sign,
    buyerSign: buyerSignData,

    creator: lot.TokenOriginal.User.metamaskAddress,
    creatorReward: lot.TokenOriginal.creatorReward,
    maker: lot.User.metamaskAddress,
    taker: buyerUser.metamaskAddress,
    price: buyPriceFixed,
    extra: '0',
    isFixedPrice: true,
    itemId: tokenNft.token,
  } as Web3Lib.LocalAtomicMatchParams;

  await Web3Lib.atomicMatch(atomiMatchParams);

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: lot.userId,
      },
      data: {
        totalSalesCount: {
          increment: 1,
        },
        totalSalesProfit: {
          increment: buyPriceFixed,
        },
      },
    }),
    prisma.lotToken.update({
      where: {
        id: lotToken.id,
      },
      data: {
        isSold: true,
        isProcessin: false,
      },
    }),
    prisma.lot.update({
      where: {
        id: lot.id,
      },
      data: {
        lastActiveAt: moment().toISOString(),
        copiesSold: {
          increment: 1,
        },
      },
    }),
    prisma.tokenNFT.update({
      where: {
        id: lotToken.tokenNftId,
      },
      data: {
        userId: buyerUser.id,
        currentLotId: null,
      },
    }),
    prisma.tokenHistory.create({
      data: {
        type: TokenHistoryType.NFT_TOKEN_CHANGED_OWNER_SALE,
        tokenOriginalId: lot.TokenOriginal.id,
        tokenNftId: lotToken.tokenNftId,
        userId: buyerUser.id,
        lotId: lot.id,

        oldOwnerId: lot.userId,
        buyPrice: buyPriceFixed,
      },
    }),
  ]);

  const activeLotTokens = await prisma.lotToken.findMany({
    where: {
      lotId: lot.id,
      isSold: false,
    },
  });

  if (activeLotTokens.length === 0) {
    await prisma.lot.update({
      where: {
        id: lot.id,
      },
      data: {
        status: LotStatus.CLOSED,
      },
    });

    await prisma.tokenHistory.create({
      data: {
        type: TokenHistoryType.LOT_CLOSED,
        tokenOriginalId: lot.TokenOriginal.id,
        lotId: lot.id,
      },
    });
  }
}
