import prisma from '@/lib_db/prisma';
import { Authorization } from '@prisma/client';

export class AuthorizationModel {
  model: Authorization;

  constructor(model: Authorization) {
    this.model = model;
  }

  static wrap(model: Authorization) {
    return new AuthorizationModel(model);
  }
}
