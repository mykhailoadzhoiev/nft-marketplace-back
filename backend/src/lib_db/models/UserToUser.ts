import prisma from '@/lib_db/prisma';
import { UserToUser, User } from '@prisma/client';

export type UserToUserRow = UserToUser & {
  Following?: User;
  Follower?: User[];
};

export class UserToUserView {
  id: string;
  userId: string;
  followerId: string;

  constructor(lotData: UserToUserView) {
    for (const lotDataKey in lotData) {
      this[lotDataKey] = lotData[lotDataKey];
    }
  }

  static getByModel(model: UserToUserRow) {
    const userView = new UserToUserView({
      id: model.id.toString(),
      userId: model.userId.toString(),
      followerId: model.followerId.toString(),
    });

    return userView;
  }
}

export class UserToUserModel {
  model: UserToUser;

  constructor(model: UserToUser) {
    this.model = model;
  }

  static wrap(model: UserToUser) {
    return new UserToUserModel(model);
  }
}
