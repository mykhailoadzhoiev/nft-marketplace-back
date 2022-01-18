import { Router, Request, Response } from 'express';
import Grid, { GridParams } from '@/lib_common/classes/grid';
import * as _ from 'lodash';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import env from '@/lib_common/env';

import prisma from '@/lib_db/prisma';
import { LotStatus, Lot, User, TokenMedia } from '@prisma/client';
import * as LotStuff from '@/lib_db/models/Lot';
import * as LotBetStuff from '@/lib_db/models/LotBet';
import { TokenNFTView } from '@/lib_db/models/TokenNFT';
import { paramsIdValidation } from '../lib/id_param_validation';
import { ExErrorsTmp, ThrowExError, ThrowExUnknown } from '@/lib_common/ex_errors';
import { imagesUserScope } from '@/lib_db/models/User';

export async function getFetchUserLots(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'name',
      checks: [{ check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'categoryId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.query)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const filters = {
    name: (req.query.name || '') as string,
    categoryId: (req.query.name || '') as string,
  };

  const grid = new Grid(req.query as GridParams).setSortOptions(['id', 'lastActiveAt', 'currentCost']).init();

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

  if (filters.name) {
    const part = {
      where: {
        email: {
          contains: filters.name,
        },
      },
    };
    rowsQueryParts.push(part);
    totalCountQueryParts.push(part);
  }

  if (filters.categoryId) {
    const part = {
      where: {
        categoryId: BigInt(filters.categoryId),
      },
    };
    rowsQueryParts.push(part);
    totalCountQueryParts.push(part);
  }

  const rows = await prisma.lot.findMany(_.merge.apply(null, rowsQueryParts));
  const totalRows = await prisma.lot.count(_.merge.apply(null, totalCountQueryParts));

  const resRows = rows.map((model) => LotStuff.LotView.getByModel(model));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: resRows,
    totalRows: totalRows,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}

export async function getFetchUserLotsWithBets(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'status',
      checks: [
        { check: (val) => Checks.isUndOrInVals(val, [LotStatus.IN_SALES, LotStatus.CLOSED]), msg: 'fieldInvalid' },
      ],
    },
  ])
    .setBody(req.query)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const filters = {
    status: (req.query.status || null) as 'IN_SALES' | 'CLOSED' | null,
  };

  // const user = await req.authorization.getUser();
  const grid = new Grid(req.query as GridParams)
    .setSortOptions(['id', 'updatedAt', 'createdAt', 'lastActiveAt'])
    .init();
  const authUserId = BigInt(req.authorization.userId);

  const rowsQueryParts = [
    {
      include: {
        TokenOriginal: {
          include: {
            TokenMedias: {
              include: {
                IpfsObject: true,
              },
            },
          },
        },
        Bets: {
          where: {
            userId: authUserId,
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
      Bets: {
        some: {
          userId: authUserId,
        },
      },
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

  if (filters.status) {
    const part = {
      where: {
        status: filters.status,
      },
    };
    rowsQueryParts.push(part);
    totalCountQueryParts.push(part);
  }

  const rows = await prisma.lot.findMany(_.merge.apply(null, rowsQueryParts));
  const totalRows = await prisma.lot.count(_.merge.apply(null, totalCountQueryParts));

  const resRows = rows.map((model) => LotStuff.LotView.getByModel(model));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: resRows,
    totalRows: totalRows,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}

export async function getFetchUserLotsWithActive(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'status',
      checks: [
        { check: (val) => Checks.isUndOrInVals(val, [LotStatus.IN_SALES, LotStatus.CLOSED]), msg: 'fieldInvalid' },
      ],
    },
  ])
    .setBody(req.query)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const filters = {
    status: (req.query.status || null) as 'IN_SALES' | 'CLOSED' | null,
  };

  // const user = await req.authorization.getUser();
  const grid = new Grid(req.query as GridParams)
    .setSortOptions(['id', 'updatedAt', 'createdAt', 'lastActiveAt'])
    .init();

  const authUserId = BigInt(req.authorization.userId);
  const lotsFetch = new LotStuff.LotFetch({
    include: {
      TokenOriginal: {
        include: {
          TokenMedias: {
            include: {
              IpfsObject: true,
            },
          },
        },
      },
      Bets: {
        where: {
          userId: authUserId,
        },
      },
    },
    skip: grid.skip,
    take: grid.take,
  });

  lotsFetch.where({
    OR: [
      {
        TokenHistories: {
          some: {
            userId: authUserId,
          },
        },
      },
      {
        TokenHistories: {
          some: {
            TokenOriginal: {
              userId: authUserId,
            },
          },
        },
      },
      {
        TokenHistories: {
          some: {
            Lot: {
              userId: authUserId,
            },
          },
        },
      },
      {
        TokenHistories: {
          some: {
            Bet: {
              userId: authUserId,
            },
          },
        },
      },
      {
        TokenHistories: {
          some: {
            TokenNFT: {
              userId: authUserId,
            },
          },
        },
      },
      {
        TokenHistories: {
          some: {
            UserOldOwner: {
              id: authUserId,
            },
          },
        },
      },
    ],
  });

  if (grid.sortBy) {
    lotsFetch.orderBy({
      [grid.sortBy]: grid.sortDesc ? 'desc' : 'asc',
    });
  }

  if (filters.status) {
    lotsFetch.where({
      status: filters.status,
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

/**
 * @method GET
 * @scheme /:id
 */
export async function getUserLotById(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const lotId = BigInt(req.params['id']);
  const userId = BigInt(req.authorization.userId);

  const lot = await prisma.lot.findFirst({
    where: {
      id: lotId,
      userId: userId,
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
    },
  });

  if (!lot) {
    return ThrowExError(res, ExErrorsTmp.Lot.NotFound);
  }

  const lotPrivate = await LotStuff.LotView.getByModel(lot);
  res.json(lotPrivate);
}

/**
 * @method GET
 */
export async function getFetchUserBets(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'lotId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.query)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }
  const filters = {
    lotId: (req.query.lotId || '') as string,
  };

  const grid = new Grid(req.query as GridParams).setSortOptions(['id', 'createdAt', 'betAmount', 'lotId']).init();

  const user = await req.authorization.getUser();
  const rowsQueryParts = [
    {
      include: {
        EftToken: true,
      },
      skip: grid.skip,
      take: grid.take,
    },
  ] as any[];
  const totalCountQueryParts = [] as any[];

  const part = {
    where: {
      userId: user.id,
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

  if (filters.lotId) {
    const part = {
      where: {
        lotId: filters.lotId,
      },
    };
    rowsQueryParts.push(part);
    totalCountQueryParts.push(part);
  }

  const rows = await prisma.lotBet.findMany(_.merge.apply(null, rowsQueryParts));
  const totalRows = await prisma.lotBet.count(_.merge.apply(null, totalCountQueryParts));

  const resRows = [];
  for (const row of rows) {
    const lotBetPublic = await LotBetStuff.LotBetView.getByModel(row);
    resRows.push(lotBetPublic);
  }

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: resRows,
    totalRows: totalRows,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}

/**
 * @method GET
 */
export async function getFetchUserTokens(req: Request, res: Response) {
  const validationResult = await new Validator([]).setBody(req.query).validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }
  const filters = {
    lotId: (req.query.lotId || '') as string,
    userId: (req.query.userId || '') as string,
  };

  const grid = new Grid(req.query as GridParams).setSortOptions(['id', 'userId', 'token', 'createdAt']).init();

  const user = await req.authorization.getUser();
  const rowsQueryParts = [
    {
      skip: grid.skip,
      take: grid.take,
    },
  ] as any[];
  const totalCountQueryParts = [] as any[];

  const part = {
    where: {
      userId: user.id,
    },
    include: {
      OriginalLot: true,
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

  if (filters.lotId) {
    const part = {
      where: {
        lotId: filters.lotId,
      },
    };
    rowsQueryParts.push(part);
    totalCountQueryParts.push(part);
  }

  const rows = await prisma.tokenNFT.findMany(_.merge.apply(null, rowsQueryParts));
  const totalRows = await prisma.tokenNFT.count(_.merge.apply(null, totalCountQueryParts));

  const resRows = rows.map((row) => TokenNFTView.getByModel(row));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: resRows,
    totalRows: totalRows,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}
