import { Request, Response } from 'express';
import Validator, { Checks, validator, ICheckParams } from '@/app_server/lib/validator';
import { TaskType, MediaType, TokenOriginalStatus, TokenOriginalType } from '@prisma/client';
import * as _ from 'lodash';
import prisma from '@/lib_db/prisma';
import axios, { AxiosResponse } from 'axios';
import { taskCreate } from '@/lib_db/models/Task';
import { TaskOrgImportData } from '@/app_daemon/tasks/TokenOriginalImport.task';
import { TokenOriginalView } from '@/lib_db/models/TokenOriginal';
import * as web3 from '@/lib_common/web3';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';

type MetaData = {
  [key: string]: string;
  name: string;
  description: string;
  image: string;
};

async function loadAndCheckMetaData(metaDataUrl: string) {
  let metaData: MetaData;
  try {
    const res = (await axios.get(metaDataUrl)) as AxiosResponse<MetaData>;
    metaData = res.data;
  } catch (error) {
    return false;
  }

  const validationResult = await new Validator([
    {
      field: 'name',
      checks: [{ check: (val) => Checks.isString(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'description',
      checks: [{ check: (val) => Checks.isString(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'image',
      checks: [{ check: (val) => validator.isURL(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(metaData)
    .validation();

  if (validationResult.isErrored()) {
    return false;
  }

  return metaData;
}

export async function importNft(req: Request, res: Response) {
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
    {
      field: 'contract',
      checks: [{ check: (val) => Checks.isString(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'tokenId',
      checks: [{ check: (val) => Checks.isStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'image',
      checks: [{ check: (val) => validator.isURL(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.body)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const userId = BigInt(req.authorization.userId);
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
  });

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

  if (processCount >= 10) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.Max10OrgsInProcess);
  }

  const body = req.body;
  const name = body.name as string;
  const description = body.description as string;
  const isUseCensored = req.body.isUseCensored as boolean;
  const copiesTotal = parseInt(body.copiesTotal) as number;
  const isCommercial = body.isCommercial as boolean;
  const creatorReward = body.creatorReward as number;
  const contract = body.contract as string;
  const tokenId = body.tokenId as string;
  const tokenContentURL = body.image as string;

  const tokenUri = await web3.getTokenURI(contract, tokenId);
  const metaData = await loadAndCheckMetaData(tokenUri);

  if (!metaData) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.ImportFaildLoadMetaData);
  }

  if (tokenContentURL !== metaData.image) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.ImportImageUrlNotMath);
  }

  /*
  const isNFTApproved = await web3.isNFTApproved(user.metamaskAddress, tokenId, contract);
  if (!isNFTApproved) {
    return ThrowExError(res, ExErrors.TokenOriginal.ImportNftIsntApproved);
  }
  */

  const tokenOriginal = await prisma.tokenOriginal.create({
    data: {
      type: TokenOriginalType.IMPORT,
      status: TokenOriginalStatus.IMPORT_TASK,
      isUseCensored,
      contentType: MediaType.IMAGE,
      userId,
      name: name,
      description: description,
      copiesTotal,
      isCommercial,
      creatorReward,
      importAddr: contract,
      importTokenId: tokenId,
    },
  });

  const taskData = {
    tokenOriginalId: tokenOriginal.id.toString(),
    contentUrl: tokenContentURL,
  } as TaskOrgImportData;

  await taskCreate(TaskType.ORG_IMPORT, taskData);

  const tokenOriginalView = TokenOriginalView.getByModel(tokenOriginal);

  res.json(tokenOriginalView);
}
