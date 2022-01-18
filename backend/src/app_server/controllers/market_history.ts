import { Request, Response } from 'express';
import Grid, { GridParams } from '@/lib_common/classes/grid';
import * as _ from 'lodash';
import Validator, { Checks } from '@/app_server/lib/validator';
import { TokenHistory, TokenHistoryType, TokenMedia, TokenOriginal } from '@prisma/client';
import prisma from '@/lib_db/prisma';
import { TokenHistoryFetch, TokenHistoryView } from '@/lib_db/models/TokenHistory';
import { imagesUserScope } from '@/lib_db/models/User';
import { notOwnerFilterForTokenOriginal } from '@/lib_db/models/TokenOriginal';

/**
 * @method get
 */
export async function getFetchTokenHistory(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'type',
      checks: [
        {
          check: (val) => Checks.isUndOrValsCollection(val, ',', Object.values(TokenHistoryType)),
          msg: 'fieldInvalid',
        },
      ],
    },
    {
      field: 'tokenOriginalId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'tokenNftId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'userId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'oldOwnerId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'tokenChangedOwnerWithUserId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'lotId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'betId',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.query)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const filters = {
    type: (req.query.type || []) as TokenHistoryType[],
    tokenOriginalId: req.query.tokenOriginalId ? BigInt(req.query.tokenOriginalId as string) : null,
    tokenNftId: req.query.tokenNftId ? BigInt(req.query.tokenNftId as string) : null,
    userId: req.query.userId ? BigInt(req.query.userId as string) : null,
    oldOwnerId: req.query.oldOwnerId ? BigInt(req.query.oldOwnerId as string) : null,
    tokenChangedOwnerWithUserId: req.query.tokenChangedOwnerWithUserId
      ? BigInt(req.query.tokenChangedOwnerWithUserId as string)
      : null,
    lotId: req.query.lotId ? BigInt(req.query.lotId as string) : null,
    betId: req.query.betId ? BigInt(req.query.betId as string) : null,
  };

  const grid = new Grid(req.query as GridParams).setSortOptions(['id']).init();

  const fetchBuilder = new TokenHistoryFetch({
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
      TokenNFT: true,
      User: {
        include: {
          ...imagesUserScope(),
        },
      },
      UserOldOwner: {
        include: {
          ...imagesUserScope(),
        },
      },
      Lot: true,
      Bet: true,
    },
    skip: grid.skip,
    take: grid.take,
  });

  if (grid.sortBy) {
    fetchBuilder.orderBy({
      [grid.sortBy]: grid.sortDesc ? 'desc' : 'asc',
    });
  }

  if (filters.tokenOriginalId) {
    fetchBuilder.where({
      tokenOriginalId: filters.tokenOriginalId,
    });
  }

  if (filters.tokenNftId) {
    fetchBuilder.where({
      tokenNftId: filters.tokenNftId,
    });
  }

  if (filters.userId) {
    fetchBuilder.where({
      userId: filters.userId,
    });
  }

  if (filters.oldOwnerId) {
    fetchBuilder.where({
      oldOwnerId: filters.oldOwnerId,
    });
  }

  if (filters.tokenChangedOwnerWithUserId) {
    fetchBuilder.where({
      OR: [
        {
          type: {
            in: [TokenHistoryType.NFT_TOKEN_CHANGED_OWNER_BET, TokenHistoryType.NFT_TOKEN_CHANGED_OWNER_SALE],
          },
          userId: filters.tokenChangedOwnerWithUserId,
        },
        {
          type: {
            in: [TokenHistoryType.NFT_TOKEN_CHANGED_OWNER_BET, TokenHistoryType.NFT_TOKEN_CHANGED_OWNER_SALE],
          },
          oldOwnerId: filters.tokenChangedOwnerWithUserId,
        },
      ],
    });
  }

  if (filters.lotId) {
    fetchBuilder.where({
      lotId: filters.lotId,
    });
  }

  if (filters.betId) {
    fetchBuilder.where({
      betId: filters.betId,
    });
  }

  const { rows, rowsTotal } = await fetchBuilder.fetch();

  let userId: bigint;
  if (req.authorization) {
    userId = BigInt(req.authorization.userId);
  }
  const filtredRows = rows.map(
    (
      model: TokenHistory & {
        TokenOriginal?: TokenOriginal & {
          TokenMedias: TokenMedia[];
        };
      },
    ) => {
      if (model.TokenOriginal) {
        const isOwner = model.userId === userId;
        if (!isOwner) {
          notOwnerFilterForTokenOriginal(model.TokenOriginal);
        }
      }
      return model;
    },
  );

  const resRows = filtredRows.map((model) => TokenHistoryView.getByModel(model));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: resRows,
    totalRows: rowsTotal,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}
