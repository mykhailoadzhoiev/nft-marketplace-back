import { Request, Response } from 'express';
import Grid, { GridParams } from '@/lib_common/classes/grid';
import prisma from '@/lib_db/prisma';
import { TaskDataOrg } from '@/app_daemon/tasks/TokenOriginal.tasks';
import { taskCreate } from '@/lib_db/models/Task';
import * as _ from 'lodash';
import { TokenOriginalStatus, TaskType, MediaType } from '@prisma/client';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import { TokenOriginalView, TokenOriginalScopes } from '@/lib_db/models/TokenOriginal';
import * as ClearDb from '@/app_server/lib/clear_db';
import { paramsIdValidation } from '@/app_server/lib/id_param_validation';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';
import { imagesUserScope } from '@/lib_db/models/User';

export async function getFetchOrgs(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'id',
      checks: [{ check: (val) => Checks.isUndOrIsStrInt(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'status',
      checks: [{ check: (val) => Checks.isUndOrInVals(val, Object.values(TokenOriginalStatus)), msg: 'fieldInvalid' }],
    },
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
      checks: [{ check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'contentType',
      checks: [{ check: (val) => Checks.isUndOrInVals(val, Object.values(MediaType)), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.query)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const filters = {
    id: (req.query.id || '') as string,
    status: (req.query.status || null) as null | TokenOriginalStatus,
    name: (req.query.name || '') as string,
    categoryId: (req.query.categoryId || '') as string,
    userId: (req.query.userId || '') as string,
    contentType: (req.query.contentType || null) as null | MediaType,
  };

  const grid = new Grid(req.query as GridParams).setSortOptions(['id', 'currentCost', 'updatedAt', 'createdAt']).init();

  const rowsQueryParts = [
    {
      include: {
        User: {
          include: {
            ...imagesUserScope(),
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

  if (filters.id) {
    const part = {
      where: {
        id: BigInt(filters.id),
      },
    };
    rowsQueryParts.push(part);
    totalCountQueryParts.push(part);
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

  if (filters.contentType) {
    const part = {
      where: {
        contentType: filters.contentType,
      },
    };
    rowsQueryParts.push(part);
    totalCountQueryParts.push(part);
  }

  const rows = await prisma.tokenOriginal.findMany(_.merge.apply(null, rowsQueryParts));
  const totalRows = await prisma.tokenOriginal.count(_.merge.apply(null, totalCountQueryParts));

  const resRows = rows.map((model) => TokenOriginalView.getByModel(model));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: resRows,
    totalRows: totalRows,
    sortBy: grid.sortBy,
    sortDesc: grid.sortDesc,
  });
}

export async function getOrgById(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const orgId = BigInt(req.params['id']);
  const org = await prisma.tokenOriginal.findFirst({
    where: {
      id: orgId,
    },
    include: {
      ...TokenOriginalScopes.includeLotsStandart,
      User: {
        include: {
          ...imagesUserScope(),
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

  if (!org) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.NotFound);
  }

  const orgView = TokenOriginalView.getByModel(org);
  res.json(orgView);
}

export async function orgConfirm(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const orgId = BigInt(req.params['id']);
  const org = await prisma.tokenOriginal.findFirst({
    where: {
      id: orgId,
    },
  });

  if (!org) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.NotFound);
  }

  if (org.status !== TokenOriginalStatus.VALIDATION) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.StatusIsntValidation);
  }

  const updateOrg = await prisma.tokenOriginal.update({
    where: {
      id: org.id,
    },
    data: {
      status: TokenOriginalStatus.TASK,
      moderatorMessage: null,
    },
  });

  const taskData = {
    orgId: org.id.toString(),
  } as TaskDataOrg;
  await taskCreate(TaskType.ORG_PROCESSING, taskData);

  const orgView = TokenOriginalView.getByModel(updateOrg);

  res.json(orgView);
}

export async function orgToDraft(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const orgId = BigInt(req.params['id']);
  const moderatorMessage = (req.body.moderatorMessage || null) as string | null;
  const org = await prisma.tokenOriginal.findFirst({
    where: {
      id: orgId,
    },
  });

  if (!org) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.NotFound);
  }

  if (org.status !== TokenOriginalStatus.VALIDATION) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.StatusIsntValidation);
  }

  const updatedOrg = await prisma.tokenOriginal.update({
    where: {
      id: org.id,
    },
    data: {
      status: TokenOriginalStatus.DRAFT,
      moderatorMessage: moderatorMessage,
    },
  });

  const orgView = await TokenOriginalView.getByModel(updatedOrg);
  res.json(orgView);
}

export async function orgDelete(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const orgId = BigInt(req.params['id']);

  const org = await prisma.tokenOriginal.findFirst({
    where: {
      id: orgId,
    },
  });

  if (!org) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.NotFound);
  }

  await ClearDb.deleteTokenOriginalById(org.id);

  res.json('deleted');
}

export async function orgReProcessing(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const orgId = BigInt(req.params['id']);

  const org = await prisma.tokenOriginal.findFirst({
    where: {
      id: orgId,
    },
  });

  if (!org) {
    return ThrowExError(res, ExErrorsTmp.TokenOriginal.NotFound);
  }

  const taskData = {
    orgId: org.id.toString(),
    isReprocessing: true,
  } as TaskDataOrg;
  await taskCreate(TaskType.ORG_PROCESSING, taskData);

  res.send('');
}
