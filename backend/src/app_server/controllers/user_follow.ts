import { Request, Response } from 'express';
import * as _ from 'lodash';
import Validator, { Checks } from '@/app_server/lib/validator';

import prisma from '@/lib_db/prisma';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';

export async function followingPut(req: Request, res: Response) {
  const userId = BigInt(req.authorization.userId);

  const validationResult = await new Validator([
    {
      field: 'userId',
      checks: [{ check: (val) => Checks.isStrInt(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.body)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const userFollowingId = BigInt(req.body.userId);

  const followingUser = await prisma.user.findUnique({
    where: {
      id: userFollowingId,
    },
  });

  if (!followingUser) {
    return ThrowExError(res, ExErrorsTmp.User.NotFound);
  }

  const link = await prisma.userToUser.findUnique({
    where: {
      userId_followerId: {
        userId: followingUser.id,
        followerId: userId,
      },
    },
  });

  if (link) {
    return res.status(208).send();
  }

  await prisma.userToUser.create({
    data: {
      userId: followingUser.id,
      followerId: userId,
    },
  });

  res.status(201).send();
}

export async function followingDelete(req: Request, res: Response) {
  const userId = BigInt(req.authorization.userId);

  const validationResult = await new Validator([
    {
      field: 'userId',
      checks: [{ check: (val) => Checks.isStrInt(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(req.body)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const userFollowingId = BigInt(req.body.userId);

  const followingUser = await prisma.user.findUnique({
    where: {
      id: userFollowingId,
    },
  });

  if (!followingUser) {
    return ThrowExError(res, ExErrorsTmp.User.NotFound);
  }

  const link = await prisma.userToUser.findUnique({
    where: {
      userId_followerId: {
        userId: followingUser.id,
        followerId: userId,
      },
    },
  });

  if (!link) {
    return ThrowExError(res, ExErrorsTmp.User.NotFound);
  }

  await prisma.userToUser.delete({
    where: {
      id: link.id,
    },
  });

  res.status(201).send();
}
