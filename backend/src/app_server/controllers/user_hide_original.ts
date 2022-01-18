import { Request, Response } from 'express';
import Grid, { GridParams } from '@/lib_common/classes/grid';
import * as _ from 'lodash';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import prisma from '@/lib_db/prisma';
import { TokenOriginalStatus } from '.prisma/client';
import { paramsIdValidation } from '../lib/id_param_validation';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';
import { imagesUserScope } from '@/lib_db/models/User';

export async function getFecthHiddenOriginals(req: Request, res: Response) {
  const grid = new Grid(req.query as GridParams).setSortOptions(['id', 'updatedAt', 'createdAt']).init();

  const userId = BigInt(req.authorization.userId);
  const rowsQueryParts = [
    {
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
      },
      skip: grid.skip,
      take: grid.take,
    },
  ] as any[];
  const totalCountQueryParts = [{}] as any[];

  const part = {
    where: {
      userId: userId,
    },
  };
  rowsQueryParts.push(part);
  totalCountQueryParts.push(part);

  if (grid.sortBy) {
    rowsQueryParts.push({
      orderBy: {
        [grid.sortBy]: grid.sortDesc ? 'desc' : 'asc',
      },
    });
  }

  const rows = await prisma.hiddenTokenOriginal.findMany(_.merge.apply(null, rowsQueryParts));
  const totalRows = await prisma.hiddenTokenOriginal.count(_.merge.apply(null, totalCountQueryParts));

  const resRows = rows.map((model) => {
    return {
      id: model.id.toString(),
      tokenOriginalId: model.tokenOriginalId.toString(),
      userId: model.userId.toString(),
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  });

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: resRows,
    totalRows: totalRows,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}

export async function postCreateHiddenOriginal(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'tokenOriginalId',
      checks: [{ check: (val) => validator.isInt(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.body)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const tokenOriginalId = BigInt(req.body.tokenOriginalId);
  const userId = BigInt(req.authorization.userId);

  const tokenOriginal = await prisma.tokenOriginal.findFirst({
    where: {
      id: tokenOriginalId,
      userId,
      status: TokenOriginalStatus.PUBLISHED,
    },
  });

  if (!tokenOriginal) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.NotFound);
  }

  const hideOriginal = await prisma.hiddenTokenOriginal.findFirst({
    where: {
      userId,
      tokenOriginalId,
    },
  });

  if (hideOriginal) {
    return res.status(208).json({
      id: hideOriginal.id.toString(),
      tokenOriginalId: hideOriginal.tokenOriginalId.toString(),
      userId: hideOriginal.userId.toString(),
      createdAt: hideOriginal.createdAt,
      updatedAt: hideOriginal.updatedAt,
    });
  }

  const newHideOriginal = await prisma.hiddenTokenOriginal.create({
    data: {
      userId,
      tokenOriginalId,
    },
  });

  res.status(201).json({
    id: newHideOriginal.id.toString(),
    tokenOriginalId: newHideOriginal.tokenOriginalId.toString(),
    userId: newHideOriginal.userId.toString(),
    createdAt: newHideOriginal.createdAt,
    updatedAt: newHideOriginal.updatedAt,
  });
}

/**
 *
 * @method DELETE
 * @schema :id
 */
export async function deleteHiddenOriginal(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const hideOrigimalId = BigInt(req.params['id']);
  const userId = BigInt(req.authorization.userId);

  const hideOriginal = await prisma.hiddenTokenOriginal.findFirst({
    where: {
      id: hideOrigimalId,
    },
  });

  if (!hideOriginal) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.NotFound);
  }

  if (hideOriginal.userId !== userId) {
    return ThrowExError(res, ExErrorsTmp.Common.Forbidden);
  }

  await prisma.hiddenTokenOriginal.delete({
    where: {
      id: hideOriginal.id,
    },
  });

  res.send('');
}
