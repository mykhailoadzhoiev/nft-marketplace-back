import { Request, Response } from 'express';
import Grid, { GridParams } from '@/lib_common/classes/grid';
import prisma from '@/lib_db/prisma';
import * as _ from 'lodash';
import { LotStatus } from '@prisma/client';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import * as LotStuff from '@/lib_db/models/Lot';
import { paramsIdValidation } from '@/app_server/lib/id_param_validation';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';
import { imagesUserScope } from '@/lib_db/models/User';

export async function getFetchLots(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'id',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'status',
      checks: [{ check: (val) => Checks.isUndOrInVals(val, Object.values(LotStatus)), msg: 'fieldInvalid' }],
    },
    {
      field: 'categoryId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'userId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.query)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const filters = {
    id: (req.query.id || '') as string,
    status: (req.query.status || null) as null | LotStatus,
    categoryId: (req.query.categoryId || '') as string,
    userId: (req.query.userId || '') as string,
  };

  const grid = new Grid(req.query as GridParams)
    .setSortOptions(['id', 'status', 'userId', 'lastActiveAt', 'updatedAt', 'createdAt', 'currentCost', 'isTop'])
    .init();

  const lotsFetch = new LotStuff.LotFetch({
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
  });

  if (grid.sortBy) {
    lotsFetch.orderBy({
      [grid.sortBy]: grid.sortDesc ? 'desc' : 'asc',
    });
  }

  if (filters.id) {
    lotsFetch.where({
      id: BigInt(filters.id),
    });
  }

  if (filters.status) {
    lotsFetch.where({
      status: filters.status,
    });
  }

  if (filters.categoryId) {
    lotsFetch.where({
      TokenOriginal: {
        categoryId: BigInt(filters.categoryId),
      },
    });
  }

  if (filters.userId) {
    lotsFetch.where({
      userId: BigInt(filters.userId),
    });
  }

  const { rows, rowsTotal } = await lotsFetch.fetch();

  const resRows = rows.map((model) => LotStuff.LotView.getByModel(model));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: resRows,
    totalRows: rowsTotal,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}

export async function getLotById(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const lotId = BigInt(req.params['id']);

  const lot = await prisma.lot.findFirst({
    where: {
      id: lotId,
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

  if (!lot) {
    return ThrowExError(res, ExErrorsTmp.Lot.NotFound);
  }

  let userId: bigint;
  let isOwner = false;
  if (req.authorization) {
    userId = BigInt(req.authorization.userId);
    if (userId) {
      isOwner = lot.userId === userId;
    }
  }

  const lotPrivate = LotStuff.LotView.getByModel(lot);
  res.json(lotPrivate);
}

export async function postToggleIsTop(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const lotId = BigInt(req.params['id']);

  const lot = await prisma.lot.findFirst({
    where: {
      id: lotId,
      status: 'IN_SALES',
    },
  });

  if (!lot) {
    return ThrowExError(res, ExErrorsTmp.Lot.NotFound);
  }

  const updatedLot = await prisma.lot.update({
    where: {
      id: lot.id,
    },
    data: {
      isTop: !lot.isTop,
    },
  });

  const lotPrivate = LotStuff.LotView.getByModel(updatedLot);
  res.json(lotPrivate);
}

export async function postCloseLot(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const lotId = BigInt(req.params['id']);

  let lot = await LotStuff.getLotById(BigInt(lotId));

  if (lot.status !== LotStatus.IN_SALES) {
    return ThrowExError(res, ExErrorsTmp.Lot.StatusIsntSale);
  }

  await LotStuff.closeLotAuctionByLotId(lot.id);

  res.json('lot updated');
}
