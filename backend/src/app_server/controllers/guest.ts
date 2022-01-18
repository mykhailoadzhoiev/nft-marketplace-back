import { Request, Response } from 'express';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import * as bcrypt from '@/lib_common/bcrypt';
import { UserJwt, UserModel } from '@/lib_db/models/User';
import { UserResetPasswordJwt, UserView, UserViewType } from '@/lib_db/models/User';
import { User } from '@prisma/client';
import prisma from '@/lib_db/prisma';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';

function userLoginValidator() {
  let validationResult = new Validator([
    {
      field: 'email',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => validator.isEmail(val), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'password',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' },
      ],
    },
  ]);
  return validationResult;
}

/**
 * @method post
 */
export async function userCreate(req: Request, res: Response) {
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
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' },
      ],
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
    validationResult.throwEx(res);
    return;
  }

  const email = req.body.email;
  44;
  const password = req.body.password;

  const user = await prisma.user.findFirst({
    where: {
      email,
    },
  });

  if (user) {
    return Validator.singleExFields(res, 'email', 'userIsExists');
  }

  const newUser = await UserModel.createUser(email, password);
  const userModel = UserModel.wrap(newUser);
  await userModel.sendRegisterNotify();
  res.status(201).json({ user: UserView.getByModel(newUser) });
}

/**
 * @method post
 */
export async function userLogin(req: Request, res: Response) {
  let validationResult = await userLoginValidator().setRequest(req).validation();
  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const email = req.body.email;
  const password = req.body.password;

  const user = (await prisma.user.findFirst({
    where: {
      email,
    },
  })) as User;

  if (!user) {
    return Validator.singleExFields(res, 'email', 'userNotFoundOrBadPassword');
  }

  const passwordIsCompare = await bcrypt.compare(password, user.passwordHash);
  if (!passwordIsCompare) {
    return Validator.singleExFields(res, 'email', 'userNotFoundOrBadPassword');
  }

  const userModel = UserModel.wrap(user);
  const authorization = await userModel.generateAuthorizationForUser();

  res.json({
    token: authorization.token,
    refreshToken: authorization.refreshToken,
    expirationTs: authorization.expirationTs,
    user: UserView.getByModel(user, UserViewType.PRIVATE),
  });
}

/**
 * @method get
 */
export async function resetPasswordInfo(req: Request, res: Response) {
  let validationResult = await new Validator([
    {
      field: 'code',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isString(val), msg: 'fieldInvalid' },
      ],
    },
  ])
    .setRequest(req)
    .validation();
  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const resetPasswordCode = req.query['code'] as string;
  const decoded = UserJwt.verifyJwtToken(resetPasswordCode);
  if (decoded) {
    const userResetPasswordJwt = Object.assign(new UserResetPasswordJwt(), decoded);
    const user = await userResetPasswordJwt.getUser();
    if (user) {
      return res.json({
        email: user.email,
      });
    }
  }

  return ThrowExError(res, ExErrorsTmp.User.BadPasswordResetCode);
}

/**
 * @method get
 */
export async function requestPasswordResetLink(req: Request, res: Response) {
  let validationResult = await new Validator([
    {
      field: 'email',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => validator.isEmail(val), msg: 'fieldInvalid' },
      ],
    },
  ])
    .setRequest(req)
    .validation();
  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const email = req.body.email;

  const user = await prisma.user.findFirst({
    where: {
      email,
    },
  });

  if (!user) {
    return Validator.singleExFields(res, 'email', 'userNotFound');
  }

  await UserModel.wrap(user).sendResetPasswordLinkNotify();

  res.json({});
}

/**
 * @method post
 */
export async function resetPassword(req: Request, res: Response) {
  let validationResult = await new Validator([
    {
      field: 'resetPasswordCode',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'password',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' },
      ],
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

  const password = req.body.password;

  const resetPasswordCode = req.body['resetPasswordCode'];
  const decoded = UserJwt.verifyJwtToken(resetPasswordCode);
  if (decoded) {
    const userResetPasswordJwt = Object.assign(new UserResetPasswordJwt(), decoded);
    const resetResult = userResetPasswordJwt.checkAndResetPassword(password);
    if (resetResult) {
      return res.json({});
    }
  }

  Validator.singleExFields(res, 'resetPasswordCode', 'fieldInvalid');
}

/**
 * @method post
 */
export async function adminLogin(req: Request, res: Response) {
  let validationResult = await userLoginValidator().setRequest(req).validation();
  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const email = req.body.email;
  const password = req.body.password;

  const user = (await prisma.user.findFirst({
    where: {
      email,
      role: {
        in: ['ADMIN', 'MODERATOR'],
      },
    },
  })) as User;

  if (!user) {
    return Validator.singleExFields(res, 'email', 'userNotFoundOrBadPassword');
  }

  const passwordIsCompare = await bcrypt.compare(password, user.passwordHash);
  if (!passwordIsCompare) {
    return Validator.singleExFields(res, 'email', 'userNotFoundOrBadPassword');
  }

  const userModel = UserModel.wrap(user);
  const authorization = await userModel.generateAuthorizationForUser();

  res.json({
    token: authorization.token,
    expirationTs: authorization.expirationTs,
    refreshToken: authorization.refreshToken,
    user: UserView.getByModel(user, UserViewType.PRIVATE),
  });
}
