import * as jwt from 'jsonwebtoken';
import * as bcrypt from '@/lib_common/bcrypt';
import * as moment from 'moment';
import * as mailer from '@/lib_common/mailer';
import { redisBase } from '@/lib_common/redis/base';
import Bs58 from '@/lib_common/bs58';
import env from '@/lib_common/env';
import * as _ from 'lodash';

import { Prisma, UserRole, User, IpfsObject, UserToUser } from '@prisma/client';
import prisma from '@/lib_db/prisma';
import { UserToUserView } from './UserToUser';
import { Enumerable } from '@/lib_common/support.types';

export class UserJwt {
  userId: string;
  role: UserRole;
  token: string = '';
  uid: string;

  constructor(token: string) {
    this.token = token;
  }

  static verifyJwtToken(token: string) {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    return decoded;
  }

  async logout() {
    await prisma.authorization.deleteMany({
      where: {
        userId: BigInt(this.userId),
        tokenUid: this.uid,
      },
    });

    const redisClient = redisBase.getClient();
    const redisKey = 'auth:' + this.userId + ':' + this.uid;
    await redisClient.del(redisKey);
  }

  getUser(): Promise<User> {
    return prisma.user.findFirst({
      where: {
        id: BigInt(this.userId),
      },
      include: {
        ...imagesUserScope(),
      },
    });
  }

  async isAuth() {
    const redisClient = redisBase.getClient();

    const redisAuth = await redisClient.get('auth:' + this.userId + ':' + this.uid);
    if (!!redisAuth) {
      try {
        const cacheData = JSON.parse(redisAuth);
        this.role = cacheData.role || null;
      } catch (error) {}
      return true;
    }

    const authorization = await prisma.authorization.findFirst({
      where: {
        userId: BigInt(this.userId),
        tokenUid: this.uid,
        expirationAt: {
          gt: moment().toISOString(),
        },
      },
    });

    if (!!authorization) {
      const exSeconds = Math.ceil(moment(authorization.expirationAt).diff(new Date()) / 1000);
      const user = await this.getUser();
      const cacheData = {
        role: user.role,
      };
      this.role = cacheData.role || null;
      await redisClient.set('auth:' + this.userId + ':' + this.uid, JSON.stringify(cacheData), ['EX', exSeconds]);
      return true;
    } else {
      return false;
    }
  }
}

export class UserActivateJwt {
  userId: bigint;
  email: string;

  public async checkAndActivate() {
    const user = await prisma.user.findFirst({
      where: {
        id: this.userId,
      },
    });
    if (user) {
      if (!user.emailActivatedAt && user.email === this.email) {
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            emailActivatedAt: new Date(),
          },
        });
        return 'success';
      }
      return 'activated';
    }
    return 'error';
  }
}

export class UserResetPasswordJwt {
  userId: bigint;
  passwordHash: string;

  public async getUser() {
    const user = await prisma.user.findFirst({
      where: {
        id: this.userId,
        passwordHash: this.passwordHash,
      },
    });
    return user;
  }

  public async checkAndResetPassword(newPassword: string) {
    const user = await this.getUser();
    if (user) {
      const newPasswordHash = await bcrypt.generatePasswordHash(newPassword);
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash: newPasswordHash,
        },
      });
      user.passwordHash = newPasswordHash;
      return true;
    }
    return false;
  }
}

export async function getUserById(userId: bigint) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
  });
  return user || null;
}

export function getFollowingScope(authUserId: bigint) {
  const scope = {} as {
    Following?: {
      where: {
        followerId: bigint;
      };
    };
  };

  if (authUserId) {
    scope.Following = {
      where: {
        followerId: authUserId,
      },
    };
  }

  return scope;
}

export function imagesUserScope() {
  return {
    Avatar: true,
    Background: true,
  };
}

export type UserRow = User & {
  Avatar?: IpfsObject;
  Background?: IpfsObject;
  Following?: UserToUser[];
  FollowedTo?: UserToUser[];
};

export enum UserViewType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  FOR_ADMIN = 'FOR_ADMIN',
}
export class UserView {
  id: string;
  email: string;
  metaName: string | null;
  name: string;
  description: string;
  socialTwitch: string;
  socialInstagram: string;
  socialTwitter: string;
  socialOnlyfans: string;
  role: UserRole;
  avatar: string | null; // sha256
  background: string | null; // sha256
  createdAt: Date;
  isActivated: boolean;
  metamaskAddress: string;
  totalSalesCount: number;
  totalSalesProfit: string; // decimal

  // special
  isFollowing: null | boolean; // null === unknown
  followingsCount?: number;
  followersCount?: number;

  // for admin
  featuredIndex?: number | null;

  // relations
  Folls?: UserToUserView[];

  constructor(lotData: UserView) {
    for (const lotDataKey in lotData) {
      this[lotDataKey] = lotData[lotDataKey];
    }
  }

  static getByModel(model: UserRow, viewType = UserViewType.PUBLIC) {
    const avatarSha256 = model.Avatar ? model.Avatar.sha256 : null;
    const backgroundSha256 = model.Background ? model.Background.sha256 : null;

    const privateData = {} as {};
    if (viewType === UserViewType.PRIVATE || viewType === UserViewType.FOR_ADMIN) {
    }

    const userView = new UserView({
      id: model.id.toString(),
      email: model.email,
      metaName: model.metaName ? model.metaName : null,
      name: model.name,
      description: model.description,
      socialTwitch: model.socialTwitch,
      socialInstagram: model.socialInstagram,
      socialTwitter: model.socialTwitter,
      socialOnlyfans: model.socialOnlyfans,
      role: model.role,
      avatar: avatarSha256,
      background: backgroundSha256,
      createdAt: model.createdAt,
      isActivated: !!model.emailActivatedAt,
      metamaskAddress: model.metamaskAddress,
      totalSalesCount: model.totalSalesCount,
      totalSalesProfit: model.totalSalesProfit.toFixed(),
      isFollowing: null,

      ...privateData,
    });

    if (viewType === UserViewType.FOR_ADMIN) {
      userView.featuredIndex = model.featuredIndex;
    }

    if (model.Following) {
      userView.isFollowing = model.Following.length > 0;

      userView.Folls = [];
      for (const foll of model.Following) {
        userView.Folls.push(UserToUserView.getByModel(foll));
      }
    }
    if (model.FollowedTo) {
      userView.Folls = userView.Folls || [];
      for (const foll of model.FollowedTo) {
        userView.Folls.push(UserToUserView.getByModel(foll));
      }
    }

    return userView;
  }

  static async includeFollCounts(userView: UserView) {
    userView.followingsCount = await prisma.userToUser.count({
      where: {
        followerId: BigInt(userView.id),
      },
    });

    userView.followersCount = await prisma.userToUser.count({
      where: {
        userId: BigInt(userView.id),
      },
    });
  }
}

export class UserModel {
  model: User;

  constructor(model: User) {
    this.model = model;
  }

  static wrap(model: User) {
    return new UserModel(model);
  }

  async generateAuthorizationForUser(expiresInSec?: number) {
    expiresInSec = expiresInSec || 60 * 60;

    const uid = Bs58.uuid(12);
    const refreshToken = uid;

    let token = jwt.sign(
      {
        uid,
        userId: this.model.id.toString(),
        role: this.model.role,
      },
      env.JWT_SECRET,
      { expiresIn: expiresInSec },
    );

    const expirationTs = Math.floor(Date.now() + expiresInSec * 1000);
    const expirationAt = new Date(expirationTs);
    const authorization = await prisma.authorization.create({
      data: {
        userId: this.model.id,
        tokenUid: uid,
        expirationAt,
      },
    });

    return { token, authorization, expirationTs, refreshToken };
  }

  async sendRegisterNotify() {
    const activateEmailCode = jwt.sign(
      {
        userId: this.model.id.toString(),
        email: this.model.email,
      },
      env.JWT_SECRET,
    );

    const activateEmailLink = env.NODE_PROTOCOL + '//' + env.NODE_HOST + '/api/user/activate/' + activateEmailCode;

    await mailer.sendEmail(
      'register.ejs',
      { activateEmailLink },
      {
        to: this.model.email,
        subject: 'Регистрация',
      },
    );
  }

  async sendResetPasswordLinkNotify() {
    const resetPasswordCode = jwt.sign(
      {
        userId: this.model.id.toString(),
        passwordHash: this.model.passwordHash,
      },
      env.JWT_SECRET,
    );

    const resetPasswordLink = env.NODE_PROTOCOL + '//' + env.NODE_HOST + '/password/reset/' + resetPasswordCode;

    await mailer.sendEmail(
      'reset_password_link.ejs',
      { resetPasswordLink },
      {
        to: this.model.email,
        subject: 'Сброс пароля',
      },
    );
  }

  static async createUser(email: string | null, password: string, options?): Promise<User> {
    options = options || {};

    const passwordHash = await bcrypt.generatePasswordHash(password);
    const createUserParams = <User>_.merge(
      {
        email,
        passwordHash,
      },
      options.params || {},
    );
    const newUser = await prisma.user.create({
      data: createUserParams,
      include: {
        ...imagesUserScope(),
      },
    });

    return newUser;
  }
}

export class UserFetch {
  rowsQuery: Prisma.UserFindManyArgs = {};

  constructor(initialQuery: Prisma.UserFindManyArgs) {
    this.rowsQuery = initialQuery;
  }

  orderBy(orderByParams: Enumerable<Prisma.UserOrderByWithRelationInput>) {
    this.rowsQuery = _.merge(this.rowsQuery, {
      orderBy: orderByParams,
    });
    return this;
  }

  where(whereParams: Prisma.UserWhereInput) {
    this.rowsQuery = _.merge(this.rowsQuery, {
      where: whereParams,
    });
    return this;
  }

  async fetch() {
    const countQuery = {
      where: this.rowsQuery.where || {},
    };
    const rows = await prisma.user.findMany(this.rowsQuery);
    const rowsTotal = await prisma.user.count(countQuery);

    return { rows, rowsTotal };
  }
}
