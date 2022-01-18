import { Request, Response } from 'express';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import { UserView, UserViewType, UserModel, imagesUserScope } from '@/lib_db/models/User';
import Bs58 from '@/lib_common/bs58';
import env, { NodeEnvType } from '@/lib_common/env';
import { redisBase } from '@/lib_common/redis/base';
import prisma from '@/lib_db/prisma';
import { getChainId } from '@/lib_common/web3';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';

async function isNewMetamaskAddress(metamaskAddress: string) {
  const user = await prisma.user.findFirst({
    where: {
      metamaskAddress: metamaskAddress,
    },
  });

  if (user) {
    return false;
  }

  return true;
}

const needChainId = getChainId() + '';
function isValidChainId(chainId: string) {
  return chainId === needChainId;
}

function getRandomMessage(metamaskAddress: string) {
  const nonce = `Nonce: ${Math.round(Math.random() * 8e6 + 1e6)}`;
  const metamaskMessage = `${env.METAMASK_MESSAGE_BASE} ${metamaskAddress}. ${nonce}`;
  return metamaskMessage;
}

function getRedisMetamaskAddressMessageKey(metamaskAddress: string) {
  const redisMetamaskAddressMessageKey = `metamask-address-message:${metamaskAddress}`;
  return redisMetamaskAddressMessageKey;
}

/**
 * @method get
 */
export async function getUserMmMessageByMmAddress(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'metamaskAddress',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' },
      ],
    },
  ])
    .setBody(req.query)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const metamaskAddress = req.query.metamaskAddress as string;

  const user = await prisma.user.findFirst({
    where: {
      metamaskAddress: metamaskAddress,
    },
  });

  if (user) {
    return res.json({
      isSign: true,
      metamaskMessage: user.metamaskMessage,
    });
  }

  const redis = redisBase.getClient();
  const metamaskMessage = getRandomMessage(metamaskAddress);
  const redisMetamaskAddressMessageKey = getRedisMetamaskAddressMessageKey(metamaskAddress);
  await redis.set(redisMetamaskAddressMessageKey, metamaskMessage, ['EX', env.METAMASK_MESSAGE_TTL]);

  return res.json({
    isSign: false,
    metamaskMessage: metamaskMessage,
  });
}

/**
 * @method post
 */
export async function userRegister(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'metamaskAddress',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => isNewMetamaskAddress(val), msg: 'isUsed' },
      ],
    },
    {
      field: 'metamaskMessage',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'metamaskSignature',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'chainId',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => isValidChainId(val), msg: 'fieldInvalid' },
      ],
    },
  ])
    .setBody(req.body)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const metamaskAddress = req.body.metamaskAddress as string;
  const metamaskMessage = req.body.metamaskMessage as string;
  const metamaskSignature = req.body.metamaskSignature as string;
  const randomPass = Bs58.getRandomBs58String(12);

  const user = await prisma.user.findFirst({
    where: {
      metamaskAddress: metamaskAddress,
    },
  });

  if (user) {
    return ThrowExError(res, ExErrorsTmp.Metamask.UserIsExist);
  }

  const redis = redisBase.getClient();
  const redisMetamaskAddressMessageKey = getRedisMetamaskAddressMessageKey(metamaskAddress);
  const messageFromRedis = await redis.get(redisMetamaskAddressMessageKey);
  if (!messageFromRedis) {
    return ThrowExError(res, ExErrorsTmp.Common.RequestTimeout);
  }
  if (messageFromRedis !== metamaskMessage) {
    return ThrowExError(res, ExErrorsTmp.Metamask.BadMessage);
  }

  const newUser = await UserModel.createUser(null, randomPass, {
    params: {
      metamaskAddress,
      metamaskMessage,
      metamaskSignature,
    },
  });

  const userModel = UserModel.wrap(newUser);
  const authorization = await userModel.generateAuthorizationForUser();

  const userView = UserView.getByModel(newUser, UserViewType.PRIVATE);
  await UserView.includeFollCounts(userView);

  res.json({
    token: authorization.token,
    expirationTs: authorization.expirationTs,
    refreshToken: authorization.refreshToken,
    user: userView,
  });
}

/**
 * @method post
 */
export async function userLogin(req: Request, res: Response) {
  const validationResult = await new Validator([
    {
      field: 'metamaskAddress',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'metamaskSignature',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'chainId',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => isValidChainId(val), msg: 'fieldInvalid' },
      ],
    },
  ])
    .setBody(req.body)
    .validation();

  if (validationResult.isErrored()) {
    return validationResult.throwEx(res);
  }

  const metamaskAddress = req.body.metamaskAddress as string;
  const metamaskSignature = req.body.metamaskSignature as string;

  const user = await prisma.user.findFirst({
    where: {
      metamaskAddress: metamaskAddress,
      metamaskSignature: metamaskSignature,
    },
    include: {
      ...imagesUserScope(),
    },
  });

  if (!user) {
    return ThrowExError(res, ExErrorsTmp.User.NotFound);
  }

  const userModel = UserModel.wrap(user);
  const authorization = await userModel.generateAuthorizationForUser();

  const userView = UserView.getByModel(user, UserViewType.PRIVATE);
  await UserView.includeFollCounts(userView);

  res.json({
    token: authorization.token,
    expirationTs: authorization.expirationTs,
    refreshToken: authorization.refreshToken,
    user: userView,
  });
}
