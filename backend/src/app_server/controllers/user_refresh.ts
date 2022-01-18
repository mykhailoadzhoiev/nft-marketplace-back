import { Router, Request, Response } from 'express';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import { UserModel, UserActivateJwt, UserJwt, UserViewType, UserView } from '@/lib_db/models/User';
import prisma from '@/lib_db/prisma';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';

export async function postUserRefreshToken(req: Request, res: Response) {
  const refreshToken = req.body.refreshToken as string;

  const authForUser = await prisma.authorization.findFirst({
    where: {
      tokenUid: refreshToken,
    },
  });

  if (!authForUser) {
    return ThrowExError(res, ExErrorsTmp.User.NotFound);
  }

  const user = await prisma.user.findFirst({
    where: {
      id: authForUser.userId,
    },
  });

  await prisma.authorization.delete({
    where: {
      id: authForUser.id,
    },
  });

  const expirationTs = Date.parse(authForUser.expirationAt.toISOString());
  const refreshExpirationAt = expirationTs + 1000 * 60 * 60 * 24;
  const now = Date.now();

  if (now < refreshExpirationAt) {
    const userModel = UserModel.wrap(user);
    const authorization = await userModel.generateAuthorizationForUser();

    const userView = UserView.getByModel(user, UserViewType.PRIVATE);
    await UserView.includeFollCounts(userView);

    return res.json({
      token: authorization.token,
      expirationTs: authorization.expirationTs,
      refreshToken: authorization.refreshToken,
      user: userView,
    });
  }

  res.status(408).send('');
}
