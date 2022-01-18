import { Request, Response } from 'express';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import Grid, { GridParams } from '@/lib_common/classes/grid';
import * as _ from 'lodash';
import { UserRole } from '@prisma/client';
import prisma from '@/lib_db/prisma';
import { UserView, UserViewType, UserModel, UserFetch, imagesUserScope } from '@/lib_db/models/User';
import { ExErrorsTmp, ThrowExError, ThrowExUnknown } from '@/lib_common/ex_errors';

export async function getFetchList(req: Request, res: Response) {
  const filters = {
    id: (req.query.id || '') as string,
    email: (req.query.email || '') as string,
    role: (req.query.role || null) as null | UserRole,
    name: (req.query.name || '') as string,
    metamaskAddress: (req.query.metamaskAddress || '') as string,
    metaName: (req.query.metaName || '') as string,
    isFeatured: ((isFeatured?: string) => {
      if (isFeatured === '1') {
        return true;
      } else if (isFeatured === '0') {
        return false;
      }
      return undefined;
    })(req.query.isFeatured as string),
  };

  const grid = new Grid(req.query as GridParams)
    .setSortOptions(['id', 'role', 'email', 'emailActivatedAt', 'name', 'createdAt', 'featuredIndex'])
    .init();

  const usersFetch = new UserFetch({
    skip: grid.skip,
    take: grid.take,
    include: {
      ...imagesUserScope(),
    },
  });

  if (grid.sortBy) {
    usersFetch.orderBy({
      [grid.sortBy]: grid.sortDesc ? 'desc' : 'asc',
    });
  }

  if (filters.id) {
    usersFetch.where({
      id: BigInt(filters.id),
    });
  }

  if (filters.email) {
    usersFetch.where({
      email: {
        contains: filters.email,
        mode: 'insensitive',
      },
    });
  }

  if (filters.role) {
    usersFetch.where({
      role: filters.role,
    });
  }

  if (filters.name) {
    usersFetch.where({
      name: {
        contains: filters.name,
        mode: 'insensitive',
      },
    });
  }

  if (filters.metamaskAddress) {
    usersFetch.where({
      metamaskAddress: {
        contains: filters.metamaskAddress,
      },
    });
  }

  if (filters.metaName) {
    usersFetch.where({
      metaName: {
        contains: filters.metaName,
        mode: 'insensitive',
      },
    });
  }

  if (typeof filters.isFeatured === 'boolean') {
    usersFetch.where(
      ((isFeatured: boolean) => {
        if (isFeatured) {
          return {
            featuredIndex: {
              not: null,
            },
          };
        } else {
          return {
            featuredIndex: null,
          };
        }
      })(filters.isFeatured),
    );
  }

  const { rows, rowsTotal } = await usersFetch.fetch();

  const rowsRes = [];
  for (const row of rows) {
    rowsRes.push(UserView.getByModel(row, UserViewType.FOR_ADMIN));
  }

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: rowsRes,
    totalRows: rowsTotal,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}

export async function create(req: Request, res: Response) {
  let validationResult = await new Validator([
    {
      field: 'email',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => validator.isEmail(val), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'password',
      checks: [{ check: (val) => Checks.isSet(val), msg: 'fieldRequired' }],
    },
    {
      field: 'passwordConfirmation',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        {
          check: (value, { body }) => value === body['password'],
          msg: 'fieldInvalid',
        },
      ],
    },
  ])
    .setRequest(req)
    .validation();
  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const email = req.body.email;
  const password = req.body.password;

  const user = await prisma.user.findFirst({
    where: {
      email,
    },
  });
  if (user) {
    return Validator.singleExFields(res, 'email', 'userIsExists');
  }

  const newUser = await UserModel.createUser(email, password, {
    params: {
      emailActivatedAt: new Date(),
    },
  });

  res.status(201).json({ user: UserView.getByModel(newUser, UserViewType.PRIVATE) });
}

/**
 * @method get
 * @scheme /:id
 */
export async function getById(req: Request, res: Response) {
  const userId = req.params.id;

  const user = await prisma.user.findFirst({
    where: {
      id: BigInt(userId),
    },
    include: {
      ...imagesUserScope(),
    },
  });

  if (!user) {
    return ThrowExError(res, ExErrorsTmp.User.NotFound);
  }

  res.json(UserView.getByModel(user, UserViewType.PRIVATE));
}

/**
 * @method post
 * @scheme /:id
 */
export async function postBanUser(req: Request, res: Response) {
  const userId = req.params.id;

  let user = await prisma.user.findFirst({
    where: {
      id: BigInt(userId),
    },
  });

  if (!user) {
    return ThrowExError(res, ExErrorsTmp.User.NotFound);
  }

  if (user.role !== 'USER') {
    return ThrowExError(res, ExErrorsTmp.User.RoleIsntUser);
  }

  user = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      role: 'GUEST',
    },
  });

  res.json(UserView.getByModel(user, UserViewType.FOR_ADMIN));
}

/**
 * @method post
 * @scheme /:id
 */
export async function postUnBanUser(req: Request, res: Response) {
  const userId = req.params.id;

  let user = await prisma.user.findFirst({
    where: {
      id: BigInt(userId),
    },
  });

  if (!user) {
    return ThrowExError(res, ExErrorsTmp.User.NotFound);
  }

  if (user.role !== 'GUEST') {
    return ThrowExError(res, ExErrorsTmp.User.RoleIsntGuest);
  }

  user = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      role: 'USER',
    },
  });

  res.json(UserView.getByModel(user, UserViewType.FOR_ADMIN));
}

/**
 * @method post
 * @scheme /:id
 */
export async function postSetFeaturedIndex(req: Request, res: Response) {
  const userId = req.params.id;
  const featuredIndex = req.body.featuredIndex as number | null;

  let user = await prisma.user.findFirst({
    where: {
      role: UserRole.USER,
      id: BigInt(userId),
    },
  });

  if (!user) {
    return ThrowExError(res, ExErrorsTmp.User.NotFound);
  }

  user = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      featuredIndex: featuredIndex,
    },
  });

  res.json(UserView.getByModel(user, UserViewType.FOR_ADMIN));
}
