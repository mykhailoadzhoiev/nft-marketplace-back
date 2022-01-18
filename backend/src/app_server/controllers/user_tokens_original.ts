import { Request, Response } from 'express';
import prisma from '@/lib_db/prisma';
import { createFetchPrivateController } from '@/lib_db/models/TokenOriginal';
import { TokenOriginalStatus } from '.prisma/client';
import * as ClearDb from '@/app_server/lib/clear_db';
import { paramsIdValidation } from '../lib/id_param_validation';
import { ExErrorsTmp, ThrowExError, ThrowExUnknown } from '@/lib_common/ex_errors';

export const getFetchUserCreatedTokensOriginal = createFetchPrivateController({
  type: 'CREATED',
  userSource: 'FROM_JWT',
});

export const getFecthUserCollectedTokensOrigina = createFetchPrivateController({
  type: 'COLLECTED',
  userSource: 'FROM_JWT',
});

/**
 * @method DELETE
 * @scheme /:id
 */
export async function deleteTokenOriginalById(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const orgId = BigInt(req.params['id']);
  const userId = BigInt(req.authorization.userId);

  const org = await prisma.tokenOriginal.findFirst({
    where: {
      id: orgId,
      userId: userId,
    },
  });

  if ([TokenOriginalStatus.BAN.toString(), TokenOriginalStatus.DRAFT.toString()].indexOf(org.status) === -1) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.StatusIsntBanOrDraft);
  }

  await ClearDb.deleteTokenOriginalById(org.id);

  res.send('deleted');
}
