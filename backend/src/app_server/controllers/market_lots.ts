import { Request, Response } from 'express';
import Grid, { GridParams } from '@/lib_common/classes/grid';
import * as _ from 'lodash';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import { LotStatus, TokenMedia, Lot, TokenOriginal, LotSaleType } from '@prisma/client';
import prisma from '@/lib_db/prisma';
import * as LotStuff from '@/lib_db/models/Lot';
import { notOwnerFilterForTokenOriginal } from '@/lib_db/models/TokenOriginal';
import * as moment from 'moment';
import { lotViewsRatingService } from '../lib/lot_views_rating.service';
import { paramsIdValidation } from '../lib/id_param_validation';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';

/**
 * @method get
 */
export async function getMarketTopLots(req: Request, res: Response) {
  const resTopLots = [];

  const topLots = await prisma.lot.findMany({
    where: {
      status: LotStatus.IN_SALES,
      isTop: true,
    },
    include: {
      ...LotStuff.scopes.standartMarketSkope,
    },
    orderBy: [{ currentCost: 'desc' }, { updatedAt: 'desc' }],
    take: 5,
  });

  for (const topLot of topLots) {
    resTopLots.push(topLot);
  }
  let needMoreLots = 5 - resTopLots.length;

  let nextLots = await prisma.lot.findMany({
    where: {
      status: LotStatus.IN_SALES,
      id: {
        notIn: resTopLots.map((v) => v.id),
      },
      Bets: {
        some: {},
      },
    },
    include: {
      ...LotStuff.scopes.standartMarketSkope,
    },
    orderBy: [{ currentCost: 'desc' }, { updatedAt: 'desc' }],
    take: needMoreLots,
  });
  for (const topLot of nextLots) {
    resTopLots.push(topLot);
  }
  needMoreLots = 5 - resTopLots.length;

  nextLots = await prisma.lot.findMany({
    where: {
      status: LotStatus.IN_SALES,
      id: {
        notIn: resTopLots.map((v) => v.id),
      },
    },
    include: {
      ...LotStuff.scopes.standartMarketSkope,
    },
    orderBy: [{ currentCost: 'desc' }, { updatedAt: 'desc' }],
    take: needMoreLots,
  });
  for (const topLot of nextLots) {
    resTopLots.push(topLot);
  }

  let userId: bigint;
  if (req.authorization) {
    userId = BigInt(req.authorization.userId);
  }
  for (const model of resTopLots) {
    const isOwner = model.userId === userId;
    if (!isOwner) {
      notOwnerFilterForTokenOriginal(model.TokenOriginal);
    }
  }

  const resRows = resTopLots.map((model) => LotStuff.LotView.getByModel(model));

  res.json(resRows);
}

/**
 * @method get
 */
export async function getFetchMarketLots(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'search',
      checks: [{ check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'status',
      checks: [
        {
          check: (val) => Checks.isUndOrInVals(val, Object.values(LotStatus)),
          msg: 'fieldInvalid',
        },
      ],
    },
    {
      field: 'updateAtIsAfter',
      checks: [{ check: (val) => Checks.isUndOrDateTime(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'categoryId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'userId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'saleType',
      checks: [{ check: (val) => Checks.isUndOrInVals(val, Object.values(LotSaleType)), msg: 'fieldInvalid' }],
    },
    {
      field: 'hasATimeLimit',
      checks: [{ check: (val) => Checks.isUndOrInVals(val, ['0', '1']), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.query)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const filters = {
    search: (req.query.search || '') as string,
    status: (req.query.status || null) as null | LotStatus,
    categoryId: (req.query.categoryId || '') as string,
    userId: (req.query.userId || '') as string,
    updateAtIsAfter: (req.query.updateAtIsAfter
      ? moment(req.query.updateAtIsAfter as string)
      : null) as null | moment.Moment,
    saleType: (req.query.saleType || null) as null | LotSaleType,
    hasATimeLimit: (req.query.hasATimeLimit === '1') as boolean,
  };

  const grid = new Grid(req.query as GridParams)
    .setSortOptions(['lastActiveAt', 'updatedAt', 'createdAt', 'currentCost', 'isTop', 'viewsRating', 'expiresAt'])
    .init();

  const lotsFetch = new LotStuff.LotFetch({
    include: {
      ...LotStuff.scopes.standartMarketSkope,
    },
    skip: grid.skip,
    take: grid.take,
  });

  lotsFetch.where({
    status: LotStatus.IN_SALES,
  });

  if (grid.sortBy) {
    if (grid.sortBy === 'expiresAt') {
      lotsFetch.orderBy([
        {
          expiresAt: grid.sortDesc ? 'desc' : 'asc',
        },
        {
          id: grid.sortDesc ? 'desc' : 'asc',
        },
      ]);
    }
    if (grid.sortBy === 'currentCost') {
      lotsFetch.orderBy([
        {
          currentCost: grid.sortDesc ? 'desc' : 'asc',
        },
        {
          Bets: {
            _count: 'desc',
          },
        },
      ]);
    } else {
      lotsFetch.orderBy({
        [grid.sortBy]: grid.sortDesc ? 'desc' : 'asc',
      });
    }
  }

  if (filters.search) {
    const search = filters.search;
    lotsFetch.where({
      OR: [
        {
          TokenOriginal: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          TokenOriginal: {
            User: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          TokenOriginal: {
            User: {
              metaName: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ],
    });
  }

  if (filters.status) {
    lotsFetch.where({
      status: filters.status,
    });
  }

  if (filters.updateAtIsAfter) {
    lotsFetch.where({
      updatedAt: {
        gte: filters.updateAtIsAfter.toISOString(true),
      },
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

  if (filters.saleType) {
    lotsFetch.where({
      saleType: filters.saleType,
    });
  }

  if (filters.hasATimeLimit) {
    lotsFetch.where({
      expiresAt: {
        not: null,
      },
    });
  }

  const { rows, rowsTotal } = await lotsFetch.fetch();

  const rowsX = await prisma.lot.findMany({
    include: {
      ...LotStuff.scopes.standartMarketSkope,
    },
    skip: grid.skip,
    take: grid.take,
    where: (() => {
      const where = {
        status: LotStatus.IN_SALES,
      };

      return where;
    })(),
  });

  let userId: bigint;
  if (req.authorization) {
    userId = BigInt(req.authorization.userId);
  }
  const filtredRows = rows.map(
    (
      model: Lot & {
        TokenOriginal: TokenOriginal & {
          TokenMedias: TokenMedia[];
        };
      },
    ) => {
      const isOwner = model.userId === userId;
      if (!isOwner) {
        notOwnerFilterForTokenOriginal(model.TokenOriginal);
      }
      return model;
    },
  );

  const resRows = filtredRows.map((model) => LotStuff.LotView.getByModel(model));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: resRows,
    totalRows: rowsTotal,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}

/**
 * @method get
 */
export async function getFetchMarketLotsFromFollowings(req: Request, res: Response) {
  let userId = null;
  if (req.authorization) {
    userId = BigInt(req.authorization.userId);
  } else {
    return res.redirect('/api/market/lots');
  }

  const validationResult = await new Validator([
    {
      field: 'search',
      checks: [{ check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'status',
      checks: [
        {
          check: (val) => Checks.isUndOrInVals(val, Object.values(LotStatus)),
          msg: 'fieldInvalid',
        },
      ],
    },
    {
      field: 'updateAtIsAfter',
      checks: [{ check: (val) => Checks.isUndOrDateTime(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'categoryId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'userId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'saleType',
      checks: [{ check: (val) => Checks.isUndOrInVals(val, Object.values(LotSaleType)), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.query)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const filters = {
    search: (req.query.search || '') as string,
    status: (req.query.status || null) as null | LotStatus,
    categoryId: (req.query.categoryId || '') as string,
    userId: (req.query.userId || '') as string,
    updateAtIsAfter: (req.query.updateAtIsAfter
      ? moment(req.query.updateAtIsAfter as string)
      : null) as null | moment.Moment,
    saleType: (req.query.saleType || null) as null | LotSaleType,
  };

  const grid = new Grid(req.query as GridParams)
    .setSortOptions(['lastActiveAt', 'updatedAt', 'createdAt', 'currentCost', 'isTop', 'viewsRating', 'expiresAt'])
    .init();

  const lotsFetch = new LotStuff.LotFetch({
    include: {
      ...LotStuff.scopes.standartMarketSkope,
    },
    skip: grid.skip,
    take: grid.take,
  });

  const followings = await prisma.userToUser.findMany({
    where: {
      followerId: userId,
    },
  });
  lotsFetch.where({
    status: LotStatus.IN_SALES,
    userId: {
      in: followings.map((relation) => relation.userId),
    },
  });

  if (grid.sortBy) {
    if (grid.sortBy === 'currentCost') {
      lotsFetch.orderBy([
        {
          currentCost: grid.sortDesc ? 'desc' : 'asc',
        },
        {
          Bets: {
            _count: 'desc',
          },
        },
      ]);
    } else {
      lotsFetch.orderBy({
        [grid.sortBy]: grid.sortDesc ? 'desc' : 'asc',
      });
    }
  }

  if (filters.search) {
    const search = filters.search;
    lotsFetch.where({
      TokenOriginal: {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      },
    });
  }

  if (filters.status) {
    lotsFetch.where({
      status: filters.status,
    });
  }

  if (filters.updateAtIsAfter) {
    lotsFetch.where({
      updatedAt: {
        gte: filters.updateAtIsAfter.toISOString(true),
      },
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
      TokenOriginal: {
        userId: BigInt(filters.userId),
      },
    });
  }

  if (filters.saleType) {
    lotsFetch.where({
      saleType: filters.saleType,
    });
  }

  const { rows, rowsTotal } = await lotsFetch.fetch();

  const filtredRows = rows.map(
    (
      model: Lot & {
        TokenOriginal: TokenOriginal & {
          TokenMedias: TokenMedia[];
        };
      },
    ) => {
      const isOwner = model.userId === userId;
      if (!isOwner) {
        notOwnerFilterForTokenOriginal(model.TokenOriginal);
      }
      return model;
    },
  );

  const resRows = filtredRows.map((model) => LotStuff.LotView.getByModel(model));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: resRows,
    totalRows: rowsTotal,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}

/**
 * @method get
 * @schema /:id
 */
export async function getMarketLotById(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const lotId = BigInt(req.params['id']);

  let authUserId: bigint;
  if (req.authorization) {
    authUserId = BigInt(req.authorization.userId);
  }

  const lot = await prisma.lot.findFirst({
    where: {
      id: lotId,
    },
    include: {
      ...LotStuff.scopes.standartMarketSkope,
      LotTokens: {
        include: {
          TokenNFT: true,
        },
      },
      Bets: {
        where: {
          isCancel: false,
        },
        orderBy: {
          id: 'desc',
        },
        take: 1,
      },
    },
  });

  if (!lot) {
    return ThrowExError(res, ExErrorsTmp.Lot.NotFound);
  }

  let isOwner = false;
  if (authUserId) {
    isOwner = lot.userId === authUserId;
  }
  if (isOwner) {
    const lotView = LotStuff.LotView.getByModel(lot);
    await lotViewsRatingService.lotView(lotView.id, authUserId);
    return res.json(lotView);
  }

  if ([LotStatus.IN_SALES.toString(), LotStatus.CLOSED.toString()].indexOf(lot.status) !== -1) {
    notOwnerFilterForTokenOriginal(lot.TokenOriginal);
    const lotView = LotStuff.LotView.getByModel(lot);
    await lotViewsRatingService.lotView(lotView.id, authUserId);
    return res.json(lotView);
  }

  res.status(404).json({ code: 404 });
}
