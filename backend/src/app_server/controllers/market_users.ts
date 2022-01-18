import { Request, Response } from 'express';
import Grid, { GridParams } from '@/lib_common/classes/grid';
import * as _ from 'lodash';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import { getFollowingScope, imagesUserScope, UserFetch, UserView } from '@/lib_db/models/User';
import { Lot, LotStatus, TokenMedia, TokenOriginal, User, UserRole, UserToUser, IpfsObject } from '@prisma/client';
import prisma from '@/lib_db/prisma';
import { createFetchPrivateController, notOwnerFilterForTokenOriginal } from '@/lib_db/models/TokenOriginal';
import { LotFetch, LotView } from '@/lib_db/models/Lot';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';
import { paramsIdValidation } from '../lib/id_param_validation';

export async function getFeaturedUsers(req: Request, res: Response) {
  const resFeaturedUsers = [] as (User & { Avatar: IpfsObject })[];
  const featuredUsersCount = 20;

  let authUserId = null;
  if (req.authorization) {
    authUserId = BigInt(req.authorization.userId);
  }

  let nextUsers = await prisma.user.findMany({
    where: {
      role: UserRole.USER,
      featuredIndex: {
        not: null,
      },
    },
    include: {
      ...imagesUserScope(),
      ...getFollowingScope(authUserId),
    },
    orderBy: [
      { featuredIndex: 'desc' },
      { totalSalesCount: 'desc' },
      { totalSalesProfit: 'desc' },
      {
        TokensOriginals: {
          _count: 'desc',
        },
      },
      {
        createdAt: 'desc',
      },
    ],
    take: featuredUsersCount,
  });
  for (const user of nextUsers) {
    resFeaturedUsers.push(user);
  }
  let needMoreUsers = featuredUsersCount - resFeaturedUsers.length;

  nextUsers = await prisma.user.findMany({
    where: {
      role: UserRole.USER,
      id: {
        notIn: resFeaturedUsers.map((v) => v.id),
      },
      totalSalesCount: {
        gte: 1,
      },
    },
    include: {
      ...imagesUserScope(),
      ...getFollowingScope(authUserId),
    },
    orderBy: [{ totalSalesCount: 'desc' }, { totalSalesProfit: 'desc' }],
    take: needMoreUsers,
  });
  for (const user of nextUsers) {
    resFeaturedUsers.push(user);
  }

  let resRows = [] as UserView[];
  for (const fUser of resFeaturedUsers) {
    const userView = UserView.getByModel(fUser);
    await UserView.includeFollCounts(userView);
    resRows.push(userView);
  }

  res.json(resRows);
}

export async function getFetchMarketUsers(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'id',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'name',
      checks: [{ check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.query)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const filters = {
    id: (req.query.id || '') as string,
    name: (req.query.name || '') as string,
  };

  const grid = new Grid(req.query as GridParams)
    .setSortOptions(['id', 'name', 'metaName', 'createdAt', 'totalSalesCount', 'totalSalesProfit'])
    .init();

  const usersFetch = new UserFetch({
    skip: grid.skip,
    take: grid.take,
    include: {
      ...imagesUserScope(),
    },
  });

  usersFetch.where({
    role: UserRole.USER,
  });

  if (grid.sortBy === 'totalSalesCount') {
    usersFetch.where({
      totalSalesCount: {
        gte: 1,
      },
    });
  }

  if (grid.sortBy) {
    if (grid.sortBy === 'totalSalesCount') {
      usersFetch.orderBy([
        { totalSalesCount: grid.sortDesc ? 'desc' : 'asc' },
        { totalSalesProfit: grid.sortDesc ? 'desc' : 'asc' },
      ]);
    } else {
      usersFetch.orderBy({
        [grid.sortBy]: grid.sortDesc ? 'desc' : 'asc',
      });
    }
  }

  if (filters.id) {
    usersFetch.where({
      id: BigInt(filters.id),
    });
  }

  if (filters.name) {
    usersFetch.where({
      OR: [
        {
          name: {
            contains: filters.name,
            mode: 'insensitive',
          },
        },
        {
          metaName: {
            contains: filters.name,
            mode: 'insensitive',
          },
        },
      ],
    });
  }

  const { rows, rowsTotal } = await usersFetch.fetch();

  const rowsRes = rows.map((row) => UserView.getByModel(row));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: rowsRes,
    totalRows: rowsTotal,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}

/**
 * @method GET
 * @scheme /:id
 */
export async function getMarketUserById(req: Request, res: Response) {
  const userId = req.params.id;

  let authUserId = null;
  if (req.authorization) {
    authUserId = BigInt(req.authorization.userId);
  }

  const user = await prisma.user.findFirst({
    where: {
      id: BigInt(userId),
      role: UserRole.USER,
    },
    include: {
      ...imagesUserScope(),
      ...getFollowingScope(authUserId),
    },
  });

  if (!user) {
    return ThrowExError(res, ExErrorsTmp.User.NotFound);
  }

  const userView = UserView.getByModel(user);
  await UserView.includeFollCounts(userView);

  res.json(userView);
}

/**
 * @method GET
 * @scheme /:metaname_or_id
 */
export async function getMarketUserByMetanameOrId(req: Request, res: Response) {
  const metaNameOrId = req.params['metaname_or_id'];

  let authUserId = null;
  if (req.authorization) {
    authUserId = BigInt(req.authorization.userId);
  }

  let user = await prisma.user.findFirst({
    where: {
      metaName: metaNameOrId,
      role: UserRole.USER,
    },
    include: {
      ...imagesUserScope(),
      ...getFollowingScope(authUserId),
    },
  });

  if (!user) {
    if (Checks.isStrInt(metaNameOrId)) {
      user = await prisma.user.findFirst({
        where: {
          id: BigInt(metaNameOrId),
          role: UserRole.USER,
        },
        include: {
          ...imagesUserScope(),
          ...getFollowingScope(authUserId),
        },
      });
    }
  }

  if (!user) {
    return ThrowExError(res, ExErrorsTmp.User.NotFound);
  }

  const userView = UserView.getByModel(user);
  await UserView.includeFollCounts(userView);

  res.json(userView);
}

export const getFetchUserTokenOriginalsCreatedByUserId = createFetchPrivateController({
  type: 'CREATED',
  userSource: 'FROM_ID',
});

export const getFetchUserTokenOriginalsCollectedByUserId = createFetchPrivateController({
  type: 'COLLECTED',
  userSource: 'FROM_ID',
});

/**
 * @method GET
 * @scheme /:id
 */
export async function getFetchLotsWithBetsByUserId(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const userId = BigInt(req.params.id);

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    res.status(404).send('users.notFound');
  }

  const validationResult = await new Validator([
    {
      field: 'status',
      checks: [
        {
          check: (val) => Checks.isUndOrInVals(val, [LotStatus.IN_SALES, LotStatus.CLOSED]),
          msg: 'fieldInvalid',
        },
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
            userId: userId,
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
          userId: userId,
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

  let authUserId: bigint;
  if (req.authorization) {
    authUserId = BigInt(req.authorization.userId);
  }
  const filtredRows = rows.map(
    (
      model: Lot & {
        TokenOriginal: TokenOriginal & {
          TokenMedias: TokenMedia[];
        };
      },
    ) => {
      const isOwner = model.userId === authUserId;
      if (!isOwner) {
        notOwnerFilterForTokenOriginal(model.TokenOriginal);
      }
      return model;
    },
  );

  const resRows = rows.map((model) => LotView.getByModel(model));

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
 * @scheme /:id
 */
export async function getFetchLotsWithActiveByUserId(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const userId = BigInt(req.params.id);

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    res.status(404).send('users.notFound');
  }

  const validationResult = await new Validator([
    {
      field: 'status',
      checks: [
        {
          check: (val) => Checks.isUndOrInVals(val, [LotStatus.IN_SALES, LotStatus.CLOSED]),
          msg: 'fieldInvalid',
        },
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

  const lotsFetch = new LotFetch({
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
          userId: userId,
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
            userId: userId,
          },
        },
      },
      {
        TokenHistories: {
          some: {
            TokenOriginal: {
              userId: userId,
            },
          },
        },
      },
      {
        TokenHistories: {
          some: {
            Lot: {
              userId: userId,
            },
          },
        },
      },
      {
        TokenHistories: {
          some: {
            Bet: {
              userId: userId,
            },
          },
        },
      },
      {
        TokenHistories: {
          some: {
            TokenNFT: {
              userId: userId,
            },
          },
        },
      },
      {
        TokenHistories: {
          some: {
            UserOldOwner: {
              id: userId,
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

  let authUserId: bigint;
  if (req.authorization) {
    authUserId = BigInt(req.authorization.userId);
  }
  const filtredRows = rows.map(
    (
      model: Lot & {
        TokenOriginal: TokenOriginal & {
          TokenMedias: TokenMedia[];
        };
      },
    ) => {
      const isOwner = model.userId === authUserId;
      if (!isOwner) {
        notOwnerFilterForTokenOriginal(model.TokenOriginal);
      }
      return model;
    },
  );

  const resRows = rows.map((model) => LotView.getByModel(model));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: resRows,
    totalRows: rowsTotal,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}

export async function getFetchUserFollowers(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const userId = BigInt(req.params.id);

  let authUserId = null;
  if (req.authorization) {
    authUserId = BigInt(req.authorization.userId);
  }

  /*
  const validationResult = await new Validator([
    {
      field: 'name',
      checks: [
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' }
      ]
    },
  ]).setBody(req.query).validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }
  */

  const filters = {
    name: (req.query.name || '') as string,
    categoryId: (req.query.name || '') as string,
  };

  const grid = new Grid(req.query as GridParams).setSortOptions(['id']).init();

  const rowsQueryParts = [
    {
      include: {
        Follower: {
          include: {
            ...imagesUserScope(),
            ...getFollowingScope(authUserId),
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

  const rows = (await prisma.userToUser.findMany(_.merge.apply(null, rowsQueryParts))) as (UserToUser & {
    Follower: User;
  })[];
  const totalRows = await prisma.userToUser.count(_.merge.apply(null, totalCountQueryParts));
  const followers = rows.map((model) => UserView.getByModel(model.Follower));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: followers,
    totalRows: totalRows,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}

export async function getFetchUserFollowings(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const userId = BigInt(req.params.id);

  let authUserId = null;
  if (req.authorization) {
    authUserId = BigInt(req.authorization.userId);
  }

  /*
  const validationResult = await new Validator([
    {
      field: 'name',
      checks: [
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' }
      ]
    },
  ]).setBody(req.query).validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }
  */

  const filters = {
    name: (req.query.name || '') as string,
    categoryId: (req.query.name || '') as string,
  };

  const grid = new Grid(req.query as GridParams).setSortOptions(['id']).init();

  const rowsQueryParts = [
    {
      include: {
        Following: {
          include: {
            ...imagesUserScope(),
            ...getFollowingScope(authUserId),
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
      followerId: userId,
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

  const rows = (await prisma.userToUser.findMany(_.merge.apply(null, rowsQueryParts))) as (UserToUser & {
    Following: User;
  })[];
  const totalRows = await prisma.userToUser.count(_.merge.apply(null, totalCountQueryParts));
  const followings = rows.map((model) => UserView.getByModel(model.Following));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: followings,
    totalRows: totalRows,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}
