import { Request, Response } from 'express';
import Grid, { GridParams } from '@/lib_common/classes/grid';
import * as _ from 'lodash';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import { TokenMedia, TokenOriginal, TokenOriginalStatus, TokenNFT } from '@prisma/client';
import prisma from '@/lib_db/prisma';
import * as LotBetStuff from '@/lib_db/models/LotBet';
import { TokenNFTView } from '@/lib_db/models/TokenNFT';
import { TokenOriginalView, TokenOriginalScopes, notOwnerFilterForTokenOriginal } from '@/lib_db/models/TokenOriginal';
import { getFollowingScope, imagesUserScope } from '@/lib_db/models/User';
import { paramsIdValidation } from '../lib/id_param_validation';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';

/**
 * @method get
 */
export async function getMarketCategories(req: Request, res: Response) {
  const merketCatogories = await prisma.marketCategory.findMany();
  res.json(
    merketCatogories.map((v) => {
      return {
        id: v.id.toString(),
        name: v.name,
      };
    }),
  );
}

/**
 * @method get
 */
export async function getFetchMarketBets(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'lotId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'userId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'eftTokenId',
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
    userId: (req.query.userId || '') as string,
    eftTokenId: (req.query.eftTokenId || '') as string,
  };

  const grid = new Grid(req.query as GridParams)
    .setSortOptions(['id', 'createdAt', 'betAmount', 'userId', 'lotId'])
    .init();

  const rowsQueryParts = [
    {
      include: {
        User: {
          include: {
            ...imagesUserScope(),
          },
        },
      },
      skip: grid.skip,
      take: grid.take,
    },
  ] as any[];
  const totalCountQueryParts = [{}] as any[];

  const part = {};
  rowsQueryParts.push(part);
  totalCountQueryParts.push(part);

  if (grid.sortBy) {
    grid.sortBy = 'id';
    grid.sortDesc = true;
  }

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
        lotId: BigInt(filters.lotId),
      },
    };
    rowsQueryParts.push(part);
    totalCountQueryParts.push(part);
  }

  if (filters.eftTokenId) {
    const part = {
      where: {
        eftTokenId: BigInt(filters.eftTokenId),
      },
    };
    rowsQueryParts.push(part);
    totalCountQueryParts.push(part);
  }

  if (filters.userId) {
    const part = {
      where: {
        userId: BigInt(filters.userId),
      },
    };
    rowsQueryParts.push(part);
    totalCountQueryParts.push(part);
  }

  const rows = await prisma.lotBet.findMany(_.merge.apply(null, rowsQueryParts));
  const totalRows = await prisma.lotBet.count(_.merge.apply(null, totalCountQueryParts));

  const resRows = rows.map((row) => LotBetStuff.LotBetView.getByModel(row));

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
 * @method get
 */
export async function getFetchMarketTokens(req: Request, res: Response) {
  const validationResult = await new Validator([
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
    userId: (req.query.userId || '') as string,
    lotId: (req.query.userId || '') as string,
  };

  const grid = new Grid(req.query as GridParams).setSortOptions(['id', 'userId', 'token', 'createdAt']).init();

  const rowsQueryParts = [
    {
      skip: grid.skip,
      take: grid.take,
    },
  ] as any[];
  const totalCountQueryParts = [{}] as any[];

  const part = {};
  rowsQueryParts.push(part);
  totalCountQueryParts.push(part);

  if (grid.sortBy) {
    rowsQueryParts.push({
      orderBy: {
        [grid.sortBy]: grid.sortDesc ? 'desc' : 'asc',
      },
    });
  }

  if (filters.userId) {
    const part = {
      where: {
        userId: BigInt(filters.userId),
      },
    };
    rowsQueryParts.push(part);
    totalCountQueryParts.push(part);
  }

  if (filters.lotId) {
    const part = {
      where: {
        userId: BigInt(filters.lotId),
      },
    };
    rowsQueryParts.push(part);
    totalCountQueryParts.push(part);
  }

  const rows = await prisma.tokenNFT.findMany(_.merge.apply(null, rowsQueryParts));
  const totalRows = await prisma.tokenNFT.count(_.merge.apply(null, totalCountQueryParts));

  const resRows = rows.map((v) => TokenNFTView.getByModel(v));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: resRows,
    totalRows: totalRows,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}

export async function getFetchTokensOriginal(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'name',
      checks: [{ check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' }],
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
    name: (req.query.name || '') as string,
    categoryId: (req.query.name || '') as string,
    userId: (req.query.userId || '') as string,
  };

  const grid = new Grid(req.query as GridParams).setSortOptions(['id', 'updatedAt', 'createdAt']).init();

  const rowsQueryParts = [
    {
      include: {
        User: {
          include: {
            ...imagesUserScope(),
          },
        },
        ...TokenOriginalScopes.includeLotsStandart,
        TokensNFT: true,
        TokenMedias: {
          include: {
            IpfsObject: true,
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
      status: TokenOriginalStatus.PUBLISHED,
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
        name: {
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

  if (filters.userId) {
    const part = {
      where: {
        userId: BigInt(filters.userId),
      },
    };
    rowsQueryParts.push(part);
    totalCountQueryParts.push(part);
  }

  const rows = await prisma.tokenOriginal.findMany(_.merge.apply(null, rowsQueryParts));
  const totalRows = await prisma.tokenOriginal.count(_.merge.apply(null, totalCountQueryParts));

  let userId: bigint;
  if (req.authorization) {
    userId = BigInt(req.authorization.userId);
  }
  const filtredRows = rows.map(
    (
      model: TokenOriginal & {
        TokenMedias: TokenMedia[];
        TokensNFT: TokenNFT[];
      },
    ) => {
      const isOwner = model.TokensNFT.filter((v) => v.userId === userId).length > 0 || model.userId === userId;
      if (!isOwner) {
        notOwnerFilterForTokenOriginal(model);
      }
      return model;
    },
  );

  const resRows = filtredRows.map((model) => TokenOriginalView.getByModel(model));

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
 * @method get
 * @schema /:id
 */
export async function getTokenOriginalById(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const tokenOriginalId = BigInt(req.params['id']);

  let authUserId: bigint;
  if (req.authorization) {
    authUserId = BigInt(req.authorization.userId);
  }

  const tokenOriginal = await prisma.tokenOriginal.findFirst({
    where: {
      id: tokenOriginalId,
    },
    include: {
      ...TokenOriginalScopes.includeLotsStandart,
      User: {
        include: {
          ...imagesUserScope(),
          ...getFollowingScope(authUserId),
        },
      },
      TokensNFT: {
        include: {
          User: {
            include: {
              ...imagesUserScope(),
            },
          },
        },
      },
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

  const isOwner =
    tokenOriginal.TokensNFT.filter((v) => v.userId === authUserId).length > 0 || tokenOriginal.userId === authUserId;
  if (isOwner) {
    const lotPrivate = TokenOriginalView.getByModel(tokenOriginal);
    return res.json(lotPrivate);
  }

  if (tokenOriginal.status === TokenOriginalStatus.PUBLISHED) {
    notOwnerFilterForTokenOriginal(tokenOriginal);
    const tokenOriginalView = TokenOriginalView.getByModel(tokenOriginal);
    return res.json(tokenOriginalView);
  }

  res.status(404).send('');
}
