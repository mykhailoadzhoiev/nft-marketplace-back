import prisma from '@/lib_db/prisma';
import {
  Prisma,
  User,
  TokenOriginal,
  TokenNFT,
  TokenMedia,
  Lot,
  MediaType,
  LotStatus,
  TokenOriginalStatus,
  TokenOriginalType,
} from '@prisma/client';
import { LotView } from '@/lib_db/models/Lot';
import { TokenNFTView } from '@/lib_db/models/TokenNFT';
import { TokenMediaView } from '@/lib_db/models/TokenMedia';
import { imagesUserScope, UserView } from './User';

import { Request, Response } from 'express';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import Grid, { GridParams } from '@/lib_common/classes/grid';
import * as _ from 'lodash';
import { paramsIdValidation } from '@/app_server/lib/id_param_validation';
import { Enumerable } from '@/lib_common/support.types';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';

export type TokenOriginalRow = TokenOriginal & {
  User?: User;
  TokensNFT?: TokenNFT[];
  TokenMedias?: TokenMedia[];
  Lots?: Lot[];
};

export const TokenOriginalScopes = {
  includeLotsStandart: {
    Lots: {
      where: {
        OR: [
          {
            status: LotStatus.IN_SALES,
          },
        ],
      },
      orderBy: {
        id: 'asc' as 'asc' | 'desc',
      },
      include: {
        User: {
          include: {
            ...imagesUserScope(),
          },
        },
      },
    },
  },
};

export class TokenOriginalView {
  id: string;
  type: TokenOriginalType;
  status: TokenOriginalStatus;
  userId: string;
  contentType: MediaType;
  categoryId: string | null;
  isUseCensored: boolean;
  name: string;
  description: string;
  moderatorMessage: string | null;
  copiesTotal: number;
  createdAt: Date;
  updatedAt: Date;
  isCommercial: boolean;
  creatorReward: number;
  importAddr: null | string;
  importTokenId: null | string;

  User?: UserView;
  TokensNFT?: TokenNFTView[];
  TokenMedias?: TokenMediaView[];
  Lots?: LotView[];

  constructor(modelPublic: TokenOriginalView) {
    for (const key in modelPublic) {
      this[key] = modelPublic[key];
    }
  }

  static getByModel(model: TokenOriginalRow) {
    const refs = {} as {
      User?: UserView;
      TokensNFT?: TokenNFTView[];
      TokenMedias?: TokenMediaView[];
      Lots?: LotView[];
    };
    if (model.User) {
      refs.User = UserView.getByModel(model.User);
    }
    if (model.TokensNFT) {
      refs.TokensNFT = model.TokensNFT.map((v) => TokenNFTView.getByModel(v));
    }
    if (model.TokenMedias) {
      refs.TokenMedias = model.TokenMedias.map((v) => TokenMediaView.getByModel(v));
    }
    if (model.Lots) {
      refs.Lots = model.Lots.map((v) => LotView.getByModel(v));
    }

    return new TokenOriginalView({
      id: model.id.toString(),
      type: model.type,
      status: model.status,
      userId: model.userId.toString(),
      contentType: model.contentType,
      categoryId: model.categoryId ? model.categoryId.toString() : null,
      isUseCensored: model.isUseCensored,
      name: model.name,
      description: model.description,
      moderatorMessage: model.moderatorMessage,
      copiesTotal: model.copiesTotal,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      isCommercial: model.isCommercial,
      creatorReward: model.creatorReward,
      importAddr: model.importAddr,
      importTokenId: model.importTokenId,

      ...refs,
    });
  }
}

export class TokenOriginalModel {
  model: TokenOriginal;

  constructor(model: TokenOriginal) {
    this.model = model;
  }

  static wrap(model: TokenOriginal) {
    return new TokenOriginalModel(model);
  }
}

export function notOwnerFilterForTokenOriginal(tokenOriginal: TokenOriginal & { TokenMedias: TokenMedia[] }) {
  tokenOriginal.TokenMedias = tokenOriginal.TokenMedias.filter(
    (v) =>
      !v.isOriginal || ((v.type === MediaType.VIDEO || v.type === MediaType.AUDIO) && !tokenOriginal.isUseCensored),
  );
}

export function createFetchPrivateController(params?: {
  type?: 'CREATED' | 'COLLECTED';
  userSource?: 'FROM_ID' | 'FROM_JWT';
}) {
  params = params || {};
  params.type = params.type || 'CREATED';
  params.userSource = params.userSource || 'FROM_ID';

  return async (req: Request, res: Response) => {
    let userId: bigint;
    let authUserId = req.authorization?.userId ? BigInt(req.authorization.userId) : null;

    if (params.userSource === 'FROM_ID') {
      const paramsIdValRes = await paramsIdValidation(req.params);
      if (paramsIdValRes.isErrored()) {
        return paramsIdValRes.throwEx(res);
      }
      const userIdParam = BigInt(req.params['id']);

      const user = await prisma.user.findFirst({
        where: {
          id: userIdParam,
        },
      });

      if (!user) {
        return ThrowExError(res, ExErrorsTmp.TokenOriginal.NotFound);
      }

      userId = user.id;
    } else if (params.userSource === 'FROM_JWT') {
      userId = BigInt(req.authorization.userId);
    }

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

    const grid = new Grid(req.query as GridParams).setSortOptions(['id', 'name', 'updatedAt', 'createdAt']).init();

    const rowsQueryParts = [
      {
        include: {
          User: {
            include: {
              ...imagesUserScope(),
            },
          },
          ...TokenOriginalScopes.includeLotsStandart,
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
        skip: grid.skip,
        take: grid.take,
      },
    ] as any[];
    const totalCountQueryParts = [{}] as any[];

    let part: any;
    if (params.type === 'CREATED') {
      part = {
        where: {
          userId: userId,
          HiddenOriginals: {
            none: {
              userId,
            },
          },
        },
      };
      if (params.userSource === 'FROM_ID') {
        part = {
          where: {
            ...part.where,
            status: TokenOriginalStatus.PUBLISHED,
          },
        };
      }
    } else if (params.type === 'COLLECTED') {
      part = {
        where: {
          userId: {
            not: userId,
          },
          TokensNFT: {
            some: {
              userId: userId,
            },
          },
          HiddenOriginals: {
            none: {
              userId,
            },
          },
        },
      };
    }
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

    const rows = await prisma.tokenOriginal.findMany(_.merge.apply(null, rowsQueryParts));
    const totalRows = await prisma.tokenOriginal.count(_.merge.apply(null, totalCountQueryParts));

    const filtredRows = rows.map(
      (
        model: TokenOriginal & {
          TokenMedias: TokenMedia[];
          TokensNFT: TokenNFT[];
        },
      ) => {
        let isOwner = false;
        if (authUserId) {
          isOwner = model.TokensNFT.filter((v) => v.userId === authUserId).length > 0 || model.userId === authUserId;
        }

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
  };
}

export class TokenOriginalFetch {
  rowsQuery: Prisma.TokenOriginalFindManyArgs = {};

  constructor(initialQuery: Prisma.TokenOriginalFindManyArgs) {
    this.rowsQuery = initialQuery;
  }

  orderBy(orderByParams: Enumerable<Prisma.TokenOriginalOrderByWithRelationInput>) {
    this.rowsQuery = _.merge(this.rowsQuery, {
      orderBy: orderByParams,
    });
    return this;
  }

  where(whereParams: Prisma.TokenOriginalWhereInput) {
    this.rowsQuery = _.merge(this.rowsQuery, {
      where: whereParams,
    });
    return this;
  }

  async fetch() {
    const countQuery = {
      where: this.rowsQuery.where || {},
    };
    const rows = await prisma.tokenOriginal.findMany(this.rowsQuery);
    const rowsTotal = await prisma.tokenOriginal.count(countQuery);

    return { rows, rowsTotal };
  }
}
