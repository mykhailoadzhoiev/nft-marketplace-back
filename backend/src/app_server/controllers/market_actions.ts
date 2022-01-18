import { Request, Response } from 'express';
import * as _ from 'lodash';
import Validator, { Checks, validator, ICheckParams } from '@/app_server/lib/validator';
import * as moment from 'moment';
import { checkBetAmountBalance, checkBetAmountApproval } from '@/lib_common/web3';

import { Lot, LotSaleType, LotStatus, Prisma, TaskType, TokenHistoryType } from '@prisma/client';
import prisma from '@/lib_db/prisma';
import {
  SignsData,
  checkSignsData,
  getLotById,
  LotView,
  closeLotAuctionByLotId,
  checkLotExistsByLotId,
  checkLotTokenNftById,
} from '@/lib_db/models/Lot';
import * as LotBetStuff from '@/lib_db/models/LotBet';
import { taskCreate } from '@/lib_db/models/Task';
import { TaskDataBuyTokenNft } from '@/app_daemon/tasks/Lot.tasks';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';

function checkTokenSignDataValid(tokenSignData: SignsData, valiParams: ICheckParams) {
  if (valiParams.validationResult.fields['lotId'].errors.length > 0) {
    return false;
  }

  if (!checkSignsData(tokenSignData)) {
    return false;
  }

  return true;
}

async function checkTokenSignDataForBet(tokenSignData: SignsData, valiParams: ICheckParams) {
  const lotId = BigInt(valiParams.body['lotId']);

  const tokenNft = await prisma.tokenNFT.findFirst({
    where: {
      id: BigInt(tokenSignData.tokenNftId),
      currentLotId: lotId,
    },
  });

  if (!tokenNft) {
    return false;
  }

  return true;
}

/**
 * @method post
 */
export async function postPlaceABet(req: Request, res: Response) {
  const user = await req.authorization.getUser();
  const userId = user.id;

  const validationResult = await new Validator([
    {
      field: 'lotId',
      checks: [
        { check: (val) => validator.isInt(val), msg: 'fieldInvalid', stopOnFail: true },
        { check: async (val, params) => checkLotExistsByLotId(val, params.temp), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'betAmount',
      checks: [
        { check: (val) => validator.isInt(val), msg: 'fieldInvalid' },
        {
          check: async (val, params) =>
            await checkBetAmountBalance(val, user.metamaskAddress, params.temp as { lot: Lot }),
          msg: 'smallBalance',
        },
        {
          check: async (val, params) =>
            await checkBetAmountApproval(val, user.metamaskAddress, params.temp as { lot: Lot }),
          msg: 'smallApproval',
        },
      ],
    },
    {
      field: 'buyerSignsData',
      each: (index) => {
        return [
          {
            field: `buyerSignsData[${index}]`,
            checks: [
              {
                check: async (val, params: ICheckParams) => checkTokenSignDataValid(val, params),
                msg: 'fieldInvalid',
                stopOnFail: true,
              },
              {
                check: async (val, params: ICheckParams) => checkTokenSignDataForBet(val, params),
                msg: 'tokenNftIsNotAvailable',
              },
            ],
          },
        ];
      },
    },
  ])
    .setBody(req.body)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const lotId = BigInt(req.body.lotId);
  const betAmount = req.body.betAmount as string;
  const betAmountDesimal = new Prisma.Decimal(betAmount);
  const buyerSignsData = req.body.buyerSignsData as SignsData[];
  const pureSignsData = buyerSignsData.map((v) => {
    return {
      tokenNftId: v.tokenNftId,
      sign: v.sign,
    };
  });

  const lot = await getLotById(lotId);

  if (lot.status !== LotStatus.IN_SALES) {
    return ThrowExError(res, ExErrorsTmp.Lot.StatusIsntSale);
  }

  if (lot.saleType !== LotSaleType.AUCTION) {
    return ThrowExError(res, ExErrorsTmp.Lot.TypeIsntAuction);
  }

  if (lot.userId === userId) {
    return ThrowExError(res, ExErrorsTmp.LotBet.BetUserIsEqualLotUser);
  }

  if (betAmountDesimal.lt(lot.currentCost)) {
    return Validator.singleExFields(res, 'betAmount', 'betIsSmall');
  }

  const newCurrentCost = betAmountDesimal.mul(1.05).floor();

  const [newBet, updatedLot] = await prisma.$transaction([
    prisma.lotBet.create({
      data: {
        userId: userId,
        lotId: lot.id,
        betAmount: betAmountDesimal.toFixed(),
        buyerSignsData: pureSignsData,
      },
    }),
    prisma.lot.update({
      where: {
        id: lot.id,
      },
      data: {
        currentCost: newCurrentCost.toFixed(),
        lastActiveAt: moment().toISOString(),
      },
    }),
  ]);

  await prisma.tokenHistory.create({
    data: {
      type: TokenHistoryType.LOT_BET_CREATED,
      tokenOriginalId: lot.tokenOriginalId,
      userId: userId,
      lotId: lot.id,
      betId: newBet.id,
    },
  });

  const betView = await LotBetStuff.LotBetView.getByModel(newBet);
  res.json(betView);
}

/**
 * @method post
 */
export async function postBetCancel(req: Request, res: Response) {
  const user = await req.authorization.getUser();
  const userId = BigInt(user.id);

  const validationResult = await new Validator([
    {
      field: 'lotBetId',
      checks: [{ check: (val) => validator.isInt(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.body)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const lotBetId = BigInt(req.body.lotBetId);
  const lotBet = await prisma.lotBet.findFirst({
    where: {
      id: lotBetId,
      userId: userId,
      isCancel: false,
      Lot: {
        status: LotStatus.IN_SALES,
      },
    },
    include: {
      Lot: true,
    },
  });

  if (!lotBet) {
    return ThrowExError(res, ExErrorsTmp.LotBet.NotFound);
  }

  const lot = lotBet.Lot;
  const topBetInLot = await prisma.lotBet.findFirst({
    where: {
      isCancel: false,
      lotId: lot.id,
    },
    orderBy: {
      id: 'desc',
    },
  });

  if (topBetInLot.id !== lotBet.id) {
    return ThrowExError(res, ExErrorsTmp.LotBet.IsntTopBet);
  }

  const timeDiffHours = moment().diff(lotBet.createdAt, 'hours');
  if (timeDiffHours < 24) {
    return ThrowExError(res, ExErrorsTmp.LotBet.LowDelayBeforeBetCancel);
  }

  const [updatedBet, tokenHistory] = await prisma.$transaction([
    prisma.lotBet.update({
      where: {
        id: lotBet.id,
      },
      data: {
        isCancel: true,
      },
    }),
    prisma.tokenHistory.create({
      data: {
        type: TokenHistoryType.LOT_BET_CANCEL,
        tokenOriginalId: lot.tokenOriginalId,
        userId: userId,
        lotId: lot.id,
        betId: lotBet.id,
      },
    }),
  ]);

  const betView = await LotBetStuff.LotBetView.getByModel(updatedBet);
  res.json(betView);
}

/**
 * @method post
 */
export async function postCloseLotAction(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'lotId',
      checks: [
        { check: (val) => validator.isInt(val), msg: 'fieldInvalid', stopOnFail: true },
        { check: async (val) => checkLotExistsByLotId(val), msg: 'fieldInvalid' },
      ],
    },
  ])
    .setBody(req.body)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const userId = BigInt(req.authorization.userId);
  const lotId = req.body.lotId as string;
  let lot = await getLotById(BigInt(lotId));

  if (userId !== lot.userId) {
    return ThrowExError(res, ExErrorsTmp.Common.Forbidden);
  }

  if (lot.status !== LotStatus.IN_SALES) {
    return ThrowExError(res, ExErrorsTmp.Lot.StatusIsntSale);
  }

  lot = await closeLotAuctionByLotId(lot.id);
  const lotView = LotView.getByModel(lot);

  res.json(lotView);
}

/**
 * @method post
 */
export async function buyLotToken(req: Request, res: Response) {
  const user = await req.authorization.getUser();
  const userId = user.id;

  const validationResult = await new Validator([
    {
      field: 'lotId',
      checks: [
        { check: (val) => validator.isInt(val), msg: 'fieldInvalid', stopOnFail: true },
        { check: async (val, params) => checkLotExistsByLotId(val, params.temp), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'tokenNftId',
      checks: [
        { check: (val) => validator.isInt(val), msg: 'fieldInvalid', stopOnFail: true },
        { check: async (val, params) => checkLotTokenNftById(val, params.temp), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'buyerSignData',
      checks: [{ check: (val) => Checks.isString(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.body)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const lotId = BigInt(req.body.lotId);
  const tokenNftId = BigInt(req.body.tokenNftId);
  let lot = await getLotById(lotId);
  const tokenNft = await prisma.tokenNFT.findFirst({
    where: {
      id: tokenNftId,
    },
  });
  const buyerSignData = req.body.buyerSignData as string;

  if (userId === lot.userId) {
    return ThrowExError(res, ExErrorsTmp.Lot.NotFound);
  }

  if (lot.saleType !== LotSaleType.SALE) {
    return ThrowExError(res, ExErrorsTmp.Lot.TypeIsntSale);
  }

  if (lot.status !== LotStatus.IN_SALES) {
    return ThrowExError(res, ExErrorsTmp.Lot.StatusIsntSale);
  }

  const lotToken = await prisma.lotToken.findFirst({
    where: {
      lotId,
      tokenNftId,
      isSold: false,
      isProcessin: false,
    },
  });

  if (!lotToken) {
    return ThrowExError(res, ExErrorsTmp.LotToken.NotAvailableForBuy);
  }

  const currentCost = lot.currentCost.toFixed();

  const balanceIsCheck = await checkBetAmountBalance(currentCost, user.metamaskAddress, { lot });
  if (!balanceIsCheck) {
    return ThrowExError(res, ExErrorsTmp.Web3.SmallBalance);
  }

  const approvalIsCheck = await checkBetAmountApproval(currentCost, user.metamaskAddress, { lot });
  if (!approvalIsCheck) {
    return ThrowExError(res, ExErrorsTmp.Web3.SmallApproval);
  }

  await taskCreate(TaskType.LOT_BUY_TOKEN, {
    userId: userId.toString(),
    lotId: lot.id.toString(),
    lotTokenId: lotToken.id.toString(),
    tokenNftId: tokenNftId.toString(),
    buyerSignData,
  } as TaskDataBuyTokenNft);

  await prisma.lotToken.update({
    where: {
      id: lotToken.id,
    },
    data: {
      isProcessin: true,
    },
  });

  res.send();
}
