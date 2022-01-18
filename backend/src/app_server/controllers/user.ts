import { Request, Response } from 'express';
import Validator, { Checks, validator } from '@/app_server/lib/validator';
import * as bcrypt from '@/lib_common/bcrypt';
import * as multer from 'multer';
import { UserActivateJwt, UserJwt, UserViewType, UserView, imagesUserScope } from '@/lib_db/models/User';
import * as path from 'path';
import Bs58 from '@/lib_common/bs58';
import { deleteIpfsObjectById } from '@/app_server/lib/clear_db';
import env from '@/lib_common/env';
import * as fs from 'fs-extra';
import { createIpfsObjectFromFile } from '@/lib_ipfs/ipfs_oms';
import prisma from '@/lib_db/prisma';
import { convertImageToAvatar } from '@/lib_common/utils';
import { ExErrorsTmp, ThrowExError, ThrowExUnknown } from '@/lib_common/ex_errors';

export async function getCurrent(req: Request, res: Response) {
  let user = await req.authorization.getUser();
  const userView = UserView.getByModel(user, UserViewType.PRIVATE);
  await UserView.includeFollCounts(userView);
  res.json(userView);
}

/**
 * @method post
 */
export async function logout(req: Request, res: Response) {
  await req.authorization.logout();
  res.json({});
}

/**
 * @method get
 * @scheme :activateJwt
 */
export async function activateJwt(req: Request, res: Response) {
  const activateJwt = req.params['activateJwt'];

  if (activateJwt) {
    const decoded = UserJwt.verifyJwtToken(activateJwt);
    if (decoded) {
      const activateUserJwt = Object.assign(new UserActivateJwt(), decoded);
      const activateStatus = await activateUserJwt.checkAndActivate();
      return res.redirect('/?activateStatus=' + activateStatus);
    }
  }

  return res.redirect('/');
}

/**
 * @method post
 */
export async function changePassword(req: Request, res: Response) {
  let validationResult = await new Validator([
    {
      field: 'oldPassword',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'newPassword',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' },
      ],
    },
    {
      field: 'newPasswordConfirmation',
      checks: [
        { check: (val) => Checks.isSet(val), msg: 'fieldRequired' },
        { check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' },
        {
          check: (value, { body }) => value === body['newPassword'],
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

  const oldPassword = req.body.oldPassword;
  const newPassword = req.body.newPassword;
  const user = await req.authorization.getUser();

  if (!user) {
    return ThrowExError(res, ExErrorsTmp.User.NotFound);
  }

  const passwordIsCompare = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!passwordIsCompare) {
    return Validator.singleExFields(res, 'oldPassword', 'fieldInvalid');
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash: await bcrypt.generatePasswordHash(newPassword),
    },
  });

  res.send('done');
}

export const uploadAvatarMiddleware = multer({
  limits: {
    fileSize: 1024 * 1024 * 50, // 50MB
  },
}).single('user_avatar');

/**
 * @method post
 */
export async function uploadAvatar(req: Request, res: Response) {
  if (req.file && ['png', 'jpeg'].indexOf(req.file.mimetype.replace(/^image\/(.*)$/, '$1')) === -1) {
    return ThrowExError(res, ExErrorsTmp.File.BadMimeType);
  }
  const maxSize = 1024 * 1024 * env.UPLOAD_AVATAR_LIMIT_MB;
  if (req.file.size > maxSize) {
    return ThrowExError(res, ExErrorsTmp.Common.PayloadTooLarge);
  }

  const userId = BigInt(req.authorization.userId);
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    include: {
      ...imagesUserScope(),
    },
  });
  const imageFile = req.file;
  const oldAvatarIpfsObject = user.Avatar;

  const tempForNewImage = path.resolve(env.DIR_TEMP_FILES, Bs58.uuid());
  await fs.writeFile(tempForNewImage, imageFile.buffer);

  const convertedAvatarImage = await convertImageToAvatar(tempForNewImage);
  await fs.remove(tempForNewImage);

  const createIpfsObjectRes = await createIpfsObjectFromFile(convertedAvatarImage, { noValidation: true });
  if (createIpfsObjectRes.isBad) {
    return ThrowExUnknown(res, createIpfsObjectRes.code);
  }
  const codeStatus = createIpfsObjectRes.code;
  const newAatarIpfsObject = createIpfsObjectRes.data;

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      avatarId: newAatarIpfsObject.id,
    },
  });

  if (oldAvatarIpfsObject && oldAvatarIpfsObject.sha256 !== newAatarIpfsObject.sha256) {
    await deleteIpfsObjectById(oldAvatarIpfsObject.id);
  }

  res.status(codeStatus).json({
    sha256: newAatarIpfsObject.sha256,
  });
}

/**
 * @method delete
 */
export async function deleteUserAvatar(req: Request, res: Response) {
  const userId = BigInt(req.authorization.userId);

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    include: {
      ...imagesUserScope(),
    },
  });

  if (user.Avatar) {
    await deleteIpfsObjectById(user.Avatar.id);
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      avatarId: null,
    },
  });

  res.send('');
}

export const uploadBackgroundMiddleware = multer({
  limits: {
    fileSize: 1024 * 1024 * 50, // 50MB
  },
}).single('user_background');

/**
 * @method post
 */
export async function uploadBackground(req: Request, res: Response) {
  if (req.file && ['png', 'jpeg'].indexOf(req.file.mimetype.replace(/^image\/(.*)$/, '$1')) === -1) {
    return ThrowExError(res, ExErrorsTmp.File.BadMimeType);
  }
  const maxSize = 1024 * 1024 * env.UPLOAD_BACKGROUND_LIMIT_MB;
  if (req.file.size > maxSize) {
    return ThrowExError(res, ExErrorsTmp.Common.PayloadTooLarge);
  }

  const userId = BigInt(req.authorization.userId);
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    include: {
      ...imagesUserScope(),
    },
  });
  const imageFile = req.file;
  const oldBackgroundIpfsObject = user.Background;

  const tempForNewImage = path.resolve(env.DIR_TEMP_FILES, Bs58.uuid());
  await fs.writeFile(tempForNewImage, imageFile.buffer);

  const createIpfsObjectRes = await createIpfsObjectFromFile(tempForNewImage, { noValidation: true });
  if (createIpfsObjectRes.isBad) {
    return ThrowExUnknown(res, createIpfsObjectRes.code);
  }
  const codeStatus = createIpfsObjectRes.code;
  const newBackgroundIpfsObject = createIpfsObjectRes.data;

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      backgroundId: newBackgroundIpfsObject.id,
    },
  });

  if (oldBackgroundIpfsObject && oldBackgroundIpfsObject.sha256 !== newBackgroundIpfsObject.sha256) {
    await deleteIpfsObjectById(oldBackgroundIpfsObject.id);
  }

  res.status(codeStatus).json({
    sha256: newBackgroundIpfsObject.sha256,
  });
}

/**
 * @method delete
 */
export async function deleteUserBackground(req: Request, res: Response) {
  const userId = BigInt(req.authorization.userId);

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    include: {
      ...imagesUserScope(),
    },
  });

  if (user.Background) {
    await deleteIpfsObjectById(user.Background.id);
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      backgroundId: null,
    },
  });

  res.send('');
}

async function checkMetaNameIsUnique(metaName: string, curUserId: bigint) {
  if (typeof metaName !== 'string') {
    return true;
  }

  const user = await prisma.user.findFirst({
    where: {
      metaName,
    },
  });

  if (user && user.id !== curUserId) {
    return false;
  }

  return true;
}

async function checkEmailIsUnique(email: any, userId: bigint) {
  if (typeof email !== 'string' || !email.length) {
    return true;
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
    },
  });

  if (!user) {
    return true;
  }

  if (user.id !== userId) {
    return false;
  }

  return true;
}

/**
 * @method post
 */
export async function settingsUpdate(req: Request, res: Response) {
  const user = await req.authorization.getUser();

  if (!user) {
    return ThrowExError(res, ExErrorsTmp.User.NotFound);
  }

  // firstName
  let validationResult = await new Validator([
    {
      field: 'email',
      checks: [
        { check: (val) => typeof val !== 'string' || !val.length || validator.isEmail(val), msg: 'fieldInvalid' },
        { check: async (val) => checkEmailIsUnique(val, user.id), msg: 'isUsed' },
      ],
    },
    {
      field: 'name',
      checks: [{ check: (val) => Checks.isUndOrString(val, { maxLen: 64 }), msg: 'fieldInvalid' }],
    },
    {
      field: 'metaName',
      checks: [
        { check: (val) => Checks.isUndOrString(val, { maxLen: 16 }), msg: 'fieldInvalid' },
        { check: (val) => checkMetaNameIsUnique(val, user.id), msg: 'isUsed' },
      ],
    },
    {
      field: 'description',
      checks: [{ check: (val) => Checks.isUndOrString(val), msg: 'fieldInvalid' }],
    },
    {
      field: 'socialTwitch',
      checks: [
        {
          check: (val) =>
            Checks.isUndOrString(val, {
              maxLen: 255,
              regex: new RegExp(/https?:\/\/twitch.tv\/\w\/?/),
            }),
          msg: 'fieldInvalid',
        },
      ],
    },
    {
      field: 'socialInstagram',
      checks: [
        {
          check: (val) =>
            Checks.isUndOrString(val, {
              maxLen: 255,
              regex: new RegExp(/https?:\/\/(www\.)?instagram\.\w+(\/\w+)?(\/)?/),
            }),
          msg: 'fieldInvalid',
        },
      ],
    },
    {
      field: 'socialTwitter',
      checks: [
        {
          check: (val) =>
            Checks.isUndOrString(val, {
              maxLen: 255,
              regex: new RegExp(/https?:\/\/(www\.)?twitter\.\w+(\/\w+)?(\/)?/),
            }),
          msg: 'fieldInvalid',
        },
      ],
    },
    {
      field: 'socialOnlyfans',
      checks: [
        {
          check: (val) =>
            Checks.isUndOrString(val, {
              maxLen: 255,
              regex: new RegExp(/https?:\/\/(www\.)?onlyfans\.\w+(\/\w+)?(\/)?/),
            }),
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

  const dataToUpdate = {} as { [key: string]: string };
  if (typeof req.body.email === 'string') {
    dataToUpdate.email = req.body.email;
  }
  if (typeof req.body.name === 'string') {
    dataToUpdate.name = req.body.name;
  }
  if (typeof req.body.metaName === 'string') {
    dataToUpdate.metaName = req.body.metaName;
  }
  if (typeof req.body.description === 'string') {
    dataToUpdate.description = req.body.description;
  }
  if (typeof req.body.socialTwitch === 'string') {
    dataToUpdate.socialTwitch = req.body.socialTwitch;
  }
  if (typeof req.body.socialInstagram === 'string') {
    dataToUpdate.socialInstagram = req.body.socialInstagram;
  }
  if (typeof req.body.socialTwitter === 'string') {
    dataToUpdate.socialTwitter = req.body.socialTwitter;
  }
  if (typeof req.body.socialOnlyfans === 'string') {
    dataToUpdate.socialOnlyfans = req.body.socialOnlyfans;
  }

  if (typeof dataToUpdate.email !== 'string' || !dataToUpdate.email) {
    dataToUpdate.email = null;
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    include: {
      ...imagesUserScope(),
    },
    data: dataToUpdate,
  });

  const userView = UserView.getByModel(updatedUser, UserViewType.PRIVATE);
  res.json(userView);
}
