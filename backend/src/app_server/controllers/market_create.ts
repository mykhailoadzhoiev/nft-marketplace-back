import { Request, Response } from 'express';
import Validator, { Checks, validator, ICheckParams } from '@/app_server/lib/validator';
import * as LotStuff from '@/lib_db/models/Lot';
import * as IpfsOms from '@/lib_ipfs/ipfs_oms';
import * as multer from 'multer';

import Bs58 from '@/lib_common/bs58';
import env from '@/lib_common/env';
import * as path from 'path';
import * as fs from 'fs-extra';
import {
  IpfsObject,
  LotSaleType,
  MediaType,
  TokenHistoryType,
  TokenOriginalStatus,
  TokenOriginalType,
} from '@prisma/client';
import { isValidContentType, SignsData, checkSignsData } from '@/lib_db/models/Lot';
import * as _ from 'lodash';
import { putTokenMediaIpfsObject, parseFlags } from '@/lib_db/models/TokenMedia';
import prisma from '@/lib_db/prisma';
import { TokenOriginalView } from '@/lib_db/models/TokenOriginal';
import { paramsIdValidation } from '../lib/id_param_validation';
import { ExErrorsTmp, ThrowExError, ThrowExFields, ThrowExUnknown } from '@/lib_common/ex_errors';
import { imagesUserScope } from '@/lib_db/models/User';

/*
async function isExistsMarketCategory (val: any) {
  const categoryId = val;
  const marketCategory = await prisma.marketCategory.findFirst({
    where: {
      id: BigInt(categoryId)
    }
  });
  return !!marketCategory;
}
*/

async function orgDataValidation(data) {
  const validationResult = await new Validator([
    {
      field: 'name',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        {
          check: (val) =>
            Checks.isUndOrString(val, {
              minLen: 1,
              maxLen: 64,
            }),
          msg: 'fieldInvalid',
        },
      ],
    },
    {
      field: 'description',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'isUseCensored',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrBool(val), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'contentType',
      checks: [{ check: (val) => isValidContentType(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'copiesTotal',
      checks: [{ check: (val) => Checks.isIntNumber(val, { min: 1, max: 10 }), msg: 'fieldInvalid' }],
    },
    {
      field: 'isCommercial',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrBool(val), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'creatorReward',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isInVals(val, [0, 5, 10, 15]), msg: 'fieldInvalid' },
      ],
    },
  ])
    .setBody(data)
    .validation();

  return validationResult;
}

export async function createNewOriginal(req: Request, res: Response) {
  const validationResult = await orgDataValidation(req.body);
  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }
  const userId = BigInt(req.authorization.userId);

  const processCount = await prisma.tokenOriginal.count({
    where: {
      userId,
      status: {
        in: [
          TokenOriginalStatus.DRAFT,
          TokenOriginalStatus.BAN,
          TokenOriginalStatus.IMPORT_TASK,
          TokenOriginalStatus.IMPORT_FAIL,
          TokenOriginalStatus.VALIDATION,
        ],
      },
    },
  });

  if (processCount > 10) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.Max10OrgsInProcess);
  }

  const name = req.body.name as string;
  const description = req.body.description as string;
  const isUseCensored = req.body.isUseCensored as boolean;
  const contentType = req.body.contentType as MediaType;
  const copiesTotal = parseInt(req.body.copiesTotal) as number;
  const isCommercial = req.body.isCommercial as boolean;
  const creatorReward = req.body.creatorReward as number;

  const tokenOriginal = await prisma.tokenOriginal.create({
    data: {
      isUseCensored,
      contentType,
      userId,
      name,
      description,
      copiesTotal,
      isCommercial,
      creatorReward,
    },
  });

  const lotView = await TokenOriginalView.getByModel(tokenOriginal);
  return res.status(201).json(lotView);
}

/**
 * @method post
 * @shema /:id
 */
export async function updateDraftMarketOrg(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const marketOrgId = req.params['id'];

  const tokenOriginal = await prisma.tokenOriginal.findFirst({
    where: {
      id: BigInt(marketOrgId),
    },
  });

  if (!tokenOriginal) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.NotFound);
  }

  if (tokenOriginal.status !== TokenOriginalStatus.DRAFT) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.StatusIsntDraft);
  }

  const user = await req.authorization.getUser();
  if (tokenOriginal.userId !== user.id) {
    return ThrowExError(res, ExErrorsTmp.Common.Forbidden);
  }

  const validationResult = await orgDataValidation(req.body);

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const name = req.body.name as string;
  const description = req.body.description as string;
  const isUseCensored = req.body.isUseCensored as boolean;
  const contentType = req.body.contentType as MediaType;
  const categoryId = req.body.categoryId;
  const copiesTotal = parseInt(req.body.copiesTotal) as number;
  const isCommercial = req.body.isCommercial as boolean;
  const creatorReward = req.body.creatorReward as number;

  const updatedTokenOriginal = await prisma.tokenOriginal.update({
    where: {
      id: tokenOriginal.id,
    },
    data: {
      isUseCensored,
      categoryId,
      contentType,
      name,
      description,
      copiesTotal,
      isCommercial,
      creatorReward,
    },
  });

  const orgView = await TokenOriginalView.getByModel(updatedTokenOriginal);
  return res.status(200).json(orgView);
}

export const uploadContentMid = multer({
  limits: {
    fileSize: env.LOT_MAKE_BASE_MAX_SIZE,
  },
}).single('file');

/**
 * @method post
 * @shema /:id
 */
export async function uploadContent(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const marketOrgId = req.params['id'];

  const file = req.file;
  let uploadFileMediaType: MediaType;
  try {
    uploadFileMediaType = IpfsOms.getContentTypeByMime(file.mimetype);
  } catch (error) {
    return ThrowExError(res, ExErrorsTmp.File.BadMimeType);
  }

  const tokenOriginal = await prisma.tokenOriginal.findFirst({
    where: {
      id: BigInt(marketOrgId),
    },
  });

  if (!tokenOriginal) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.NotFound);
  }

  if (tokenOriginal.status !== TokenOriginalStatus.DRAFT) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.StatusIsntDraft);
  }

  if (tokenOriginal.type === TokenOriginalType.IMPORT) {
    return ThrowExError(res, {
      code: 403,
      error: 'token_original.deny_for_import_type',
    });
  }

  if (tokenOriginal.contentType !== uploadFileMediaType) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.BadFileContentType);
  }

  const user = await req.authorization.getUser();
  if (tokenOriginal.userId !== user.id) {
    return ThrowExError(res, ExErrorsTmp.Common.Forbidden);
  }

  const allowMimeType = env.getLotContentMimeType(uploadFileMediaType);
  if (allowMimeType.indexOf(file.mimetype) === -1) {
    return ThrowExError(res, ExErrorsTmp.File.BadMimeType);
  }

  const fileSize = file.size;
  const maxSize = env.getLotContentMaxSize(uploadFileMediaType);
  if (fileSize > maxSize) {
    return ThrowExError(res, ExErrorsTmp.Common.PayloadTooLarge);
  }

  const tempName = Bs58.uuid();
  const tempFile = path.resolve(env.DIR_TEMP_FILES, tempName);
  await fs.writeFile(tempFile, file.buffer);

  const ipfsObjectRes = await IpfsOms.createIpfsObjectFromFile(tempFile);

  let code = 201;
  let ipfsObject: IpfsObject;
  if (ipfsObjectRes.isGood) {
    code = ipfsObjectRes.code;
    ipfsObject = ipfsObjectRes.data;
  } else {
    if (ipfsObjectRes.code === 422 && ipfsObjectRes.errData.fields) {
      const exFields = ipfsObjectRes.errData.fields as {
        [field: string]: {
          errors: string[];
        };
      };
      return ThrowExFields(res, exFields);
    } else {
      return ThrowExUnknown(res, ipfsObjectRes.code, ipfsObjectRes.errData);
    }
  }

  const mediaFlags = parseFlags({
    isOriginal: true,
  });
  await putTokenMediaIpfsObject(tokenOriginal.id, ipfsObject, mediaFlags);

  return res.status(code).json({ code, message: 'ok' });
}

/**
 * @method post
 * @shema /:id
 */
export async function draftComplete(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const marketOrgId = req.params['id'];

  const tokenOriginal = await prisma.tokenOriginal.findFirst({
    where: {
      id: BigInt(marketOrgId),
    },
    include: {
      TokenMedias: {
        include: {
          IpfsObject: true,
        },
      },
    },
  });

  if (!tokenOriginal) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.NotFound);
  }

  if (tokenOriginal.status !== TokenOriginalStatus.DRAFT) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.StatusIsntDraft);
  }

  const user = await req.authorization.getUser();
  if (tokenOriginal.userId !== user.id) {
    return ThrowExError(res, ExErrorsTmp.Common.Forbidden);
  }

  const tokenOriginalView = TokenOriginalView.getByModel(tokenOriginal);

  let isChekedLot = tokenOriginalView.TokenMedias.filter((i) => i.isOriginal).length > 0;

  if (!isChekedLot) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.ContentsNotLoad);
  }

  let newStatus = TokenOriginalStatus.VALIDATION;

  const updateTokenOriginal = await prisma.tokenOriginal.update({
    where: {
      id: BigInt(marketOrgId),
    },
    data: {
      status: newStatus,
    },
    include: {
      User: {
        include: {
          ...imagesUserScope(),
        },
      },
      TokenMedias: {
        include: {
          IpfsObject: true,
        },
      },
    },
  });

  const orgView = TokenOriginalView.getByModel(updateTokenOriginal);

  res.json(orgView);
}

async function checkTokenOriginal(tokenOriginalId: string) {
  const tokenOriginal = await prisma.tokenOriginal.findFirst({
    where: {
      id: BigInt(tokenOriginalId),
    },
  });

  if (!tokenOriginal) {
    return false;
  }

  return true;
}

function checkTokenSignDataValid(tokenSignData: SignsData, valiParams: ICheckParams) {
  if (valiParams.validationResult.fields['tokenOriginalId'].errors.length > 0) {
    return false;
  }

  if (!checkSignsData(tokenSignData)) {
    return false;
  }

  return true;
}

async function checkTokenSignDataForLotCreate(
  tokenSignData: SignsData,
  tokenOwnerUserId: bigint,
  valiParams: ICheckParams,
) {
  const tokenOriginalId = BigInt(valiParams.body['tokenOriginalId']);

  const tokenNft = await prisma.tokenNFT.findFirst({
    where: {
      id: BigInt(tokenSignData.tokenNftId),
      tokenOriginalId: tokenOriginalId,
      userId: tokenOwnerUserId,
      currentLotId: null,
    },
  });

  if (!tokenNft) {
    return false;
  }

  return true;
}

export async function createLot(req: Request, res: Response) {
  const userId = BigInt(req.authorization.userId);

  const validationResult = await new Validator([
    {
      field: 'saleType',
      checks: [{ check: (val) => Checks.isInVals(val, [LotSaleType.AUCTION, LotSaleType.SALE]), msg: 'fieldInvalid' }],
    },
    {
      field: 'tokenOriginalId',
      checks: [
        { check: (val) => validator.isInt(val), msg: 'fieldInvalid', stopOnFail: true },
        { check: async (val) => checkTokenOriginal(val), msg: 'notFound', stopOnFail: true },
      ],
    },
    {
      field: 'sellerSignsData',
      each: (index) => {
        return [
          {
            field: `sellerSignsData[${index}]`,
            checks: [
              {
                check: async (val, valiParams) => checkTokenSignDataValid(val, valiParams),
                msg: 'fieldInvalid',
                stopOnFail: true,
              },
              {
                check: async (val, valiParams) => checkTokenSignDataForLotCreate(val, userId, valiParams),
                msg: 'tokenNftIsNotAvailable',
              },
            ],
          },
        ];
      },
    },
    {
      field: 'minimalCost',
      checks: [{ check: (val) => val === null || Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'expiresOffsetSec',
      checks: [
        { check: (val) => val === null || typeof val === 'number', msg: 'fieldInvalid', stopOnFail: true },
        {
          check: (val) => val === null || (typeof val === 'number' && val > 86400),
          msg: 'offsetIsSmall',
          stopOnFail: true,
        },
      ],
    },
  ])
    .setBody(req.body)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const saleType = req.body.saleType as LotSaleType;
  const tokenOriginalId = req.body.tokenOriginalId as string;
  const tokenOriginalIdBI = BigInt(tokenOriginalId);
  const minimalCost = (req.body.minimalCost || '0') as string;
  const expiresOffsetSec = req.body.expiresOffsetSec as null | number;
  let expiresAt = expiresOffsetSec === null ? null : new Date(Date.now() + expiresOffsetSec * 1000);
  const sellerSignsData = req.body.sellerSignsData as SignsData[];
  const pureSignsData = sellerSignsData.map((v) => {
    return {
      tokenNftId: v.tokenNftId,
      sign: v.sign,
    };
  });

  if (saleType === LotSaleType.SALE) {
    expiresAt = null;
  }

  let marketplaceVer = 2;
  if (req.header('X-Old-Marketplace-Ver-l9x71a47p')) {
    marketplaceVer = 1;
  }

  const copiesTotal = pureSignsData.length;
  const newLot = await prisma.lot.create({
    data: {
      saleType,
      tokenOriginalId: tokenOriginalIdBI,
      userId,
      copiesTotal,
      minimalCost,
      currentCost: minimalCost,
      expiresAt,
      isUseTimer: !!expiresAt,
      sellerSignsData: pureSignsData,
      marketplaceVer,
    },
  });

  await prisma.tokenHistory.create({
    data: {
      type: TokenHistoryType.LOT_CREATED,
      tokenOriginalId: tokenOriginalIdBI,
      userId: userId,
      lotId: newLot.id,
    },
  });

  for (const signData of pureSignsData) {
    const tokenNftIdBI = BigInt(signData.tokenNftId);
    await prisma.tokenNFT.update({
      where: {
        id: tokenNftIdBI,
      },
      data: {
        currentLotId: newLot.id,
      },
    });

    await prisma.lotToken.create({
      data: {
        lotId: newLot.id,
        tokenNftId: tokenNftIdBI,
      },
    });

    await prisma.tokenHistory.create({
      data: {
        type: TokenHistoryType.NFT_TOKEN_PUT_UP_FOR_SALE,
        tokenOriginalId: tokenOriginalIdBI,
        tokenNftId: tokenNftIdBI,
        userId: userId,
        lotId: newLot.id,
      },
    });
  }

  const createdResaleLot = await prisma.lot.findFirst({
    where: {
      id: newLot.id,
    },
    include: {
      User: {
        include: {
          ...imagesUserScope(),
        },
      },
      TokenOriginal: {
        include: {
          TokenMedias: {
            include: {
              IpfsObject: true,
            },
          },
        },
      },
      LotTokens: {
        include: {
          TokenNFT: true,
        },
      },
    },
  });

  const lotView = LotStuff.LotView.getByModel(createdResaleLot);

  res.json(lotView);
}

export async function auctionLotUpdate(req, res) {
  const userId = BigInt(req.authorization.userId);

  const validationResult = await new Validator([
    {
      field: 'lotId',
      checks: [
        { check: (val) => validator.isInt(val), msg: 'fieldInvalid', stopOnFail: true },
        { check: async (val) => LotStuff.checkLotExistsByLotId(val), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'expiresOffsetSec',
      checks: [
        { check: (val) => val === null || typeof val === 'number', msg: 'fieldInvalid', stopOnFail: true },
        {
          check: (val) => val === null || (typeof val === 'number' && val > 86400),
          msg: 'offsetIsSmall',
          stopOnFail: true,
        },
      ],
    },
  ])
    .setBody(req.body)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const lotId = BigInt(req.body.lotId);
  const expiresOffsetSec = req.body.expiresOffsetSec as null | number;
  const expiresAt = expiresOffsetSec === null ? null : new Date(Date.now() + expiresOffsetSec * 1000);

  const lot = await prisma.lot.findUnique({
    where: {
      id: lotId,
    },
  });

  if (!lot) {
    res.status(404).send('lot not found');
    return;
  }

  if (lot.userId !== userId) {
    return ThrowExError(res, ExErrorsTmp.Common.Forbidden);
  }

  if (lot.saleType !== LotSaleType.AUCTION) {
    return ThrowExError(res, ExErrorsTmp.Lot.TypeIsntAuction);
  }

  const updatedLot = await prisma.lot.update({
    where: {
      id: lot.id,
    },
    data: {
      expiresAt,
      isUseTimer: !!expiresAt,
    },
    include: {
      User: {
        include: {
          ...imagesUserScope(),
        },
      },
      TokenOriginal: {
        include: {
          TokenMedias: {
            include: {
              IpfsObject: true,
            },
          },
        },
      },
      LotTokens: {
        include: {
          TokenNFT: true,
        },
      },
    },
  });

  const lotView = LotStuff.LotView.getByModel(updatedLot);
  res.json(lotView);
}
