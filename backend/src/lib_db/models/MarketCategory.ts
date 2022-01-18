import { MarketCategory } from '@prisma/client';
import prisma from '@/lib_db/prisma';

export class MarketCategoryModel {
  model: MarketCategory;

  constructor(model: MarketCategory) {
    this.model = model;
  }

  static wrap(model: MarketCategory) {
    return new MarketCategoryModel(model);
  }
}
