import { Request, Response } from 'express';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import { TokenOriginalFetch } from '@/lib_db/models/TokenOriginal';
import { TokenOriginalType } from '.prisma/client';
import { getOwnedItems } from '@/lib_common/web3';

export async function getUserTridPartyTokens(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'marketAddr',
      checks: [{ check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.query)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const filters = {
    marketAddr: (req.query.marketAddr || '') as string,
  };

  const userId = BigInt(req.authorization.userId);

  const fetchQuery = new TokenOriginalFetch({
    where: {
      userId,
      type: TokenOriginalType.IMPORT,
    },
    select: {
      importAddr: true,
      importTokenId: true,
    },
  });

  if (filters.marketAddr) {
    fetchQuery.where({
      importAddr: filters.marketAddr,
    });
  }

  const { rows, rowsTotal } = await fetchQuery.fetch();
  const typedRows = rows as {
    importAddr: string;
    importTokenId: string;
  }[];

  const result = {} as { [marketAddr: string]: string[] };

  for (const tmpRow of typedRows) {
    if (!result[tmpRow.importAddr]) {
      result[tmpRow.importAddr] = [];
    }
    result[tmpRow.importAddr].push(tmpRow.importTokenId);
  }

  res.json(result);
}

export async function getOwnedItemsApi(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'contractAddress',
      checks: [{ check: (val) => Checks.isString(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'ownerAddress',
      checks: [{ check: (val) => Checks.isString(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.query)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const contractAddress = req.query.contractAddress as string;
  const ownerAddress = req.query.ownerAddress as string;
  const result = await getOwnedItems(contractAddress, ownerAddress);

  res.json(result);
}
