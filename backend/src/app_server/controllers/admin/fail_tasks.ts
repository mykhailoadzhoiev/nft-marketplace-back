import { Request, Response } from 'express';
import Grid, { GridParams } from '@/lib_common/classes/grid';
import prisma from '@/lib_db/prisma';
import * as _ from 'lodash';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import { paramsIdValidation } from '@/app_server/lib/id_param_validation';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';
import { Prisma } from '@prisma/client';

export async function getFetchFailedTasks(req: Request, res: Response) {
  const validationResult = await new Validator([]).setBody(req.query).validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const filters = {};

  const grid = new Grid(req.query as GridParams).setSortOptions(['id']).init();

  const rowsQueryParts = [
    {
      skip: grid.skip,
      take: grid.take,
    },
  ] as any[];
  const totalCountQueryParts = [{}] as any[];

  const part = {
    where: {
      isFail: true,
      deletedAt: null,
    },
  } as Prisma.TaskFindManyArgs;
  rowsQueryParts.push(part);
  totalCountQueryParts.push(part);

  if (grid.sortBy) {
    rowsQueryParts.push({
      orderBy: {
        [grid.sortBy]: grid.sortDesc ? 'desc' : 'asc',
      },
    });
  }

  const rows = await prisma.task.findMany(_.merge.apply(null, rowsQueryParts));
  const totalRows = await prisma.task.count(_.merge.apply(null, totalCountQueryParts));

  const resRows = rows.map((model) => {
    return {
      id: model.id.toString(),
      data: JSON.stringify(model.data, null, 2),
      type: model.type,
      failAt: model.failAt,
      errorText: model.errorText,
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

export async function postTaskRecover(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const taskId = BigInt(req.params['id']);

  let task = await prisma.task.findFirst({
    where: {
      id: taskId,
      isFail: true,
    },
  });

  if (!task) {
    return ThrowExError(res, ExErrorsTmp.Task.NotFound);
  }

  task = await prisma.task.update({
    where: {
      id: task.id,
    },
    data: {
      attempts: 0,
      isFail: false,
    },
  });

  res.json({
    id: task.id.toString(),
    type: task.type,
    failAt: task.failAt,
    errorText: task.errorText,
  });
}

export async function deleteTask(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const taskId = BigInt(req.params['id']);

  let task = await prisma.task.findFirst({
    where: {
      id: taskId,
      isFail: true,
      deletedAt: null,
    },
  });

  if (!task) {
    return ThrowExError(res, ExErrorsTmp.Task.NotFound);
  }

  task = await prisma.task.update({
    where: {
      id: task.id,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  res.send('');
}
