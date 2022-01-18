import { IpfsObjectThumb } from '@prisma/client';

export class IpfsObjectThumbModel {
  model: IpfsObjectThumb;

  constructor(model: IpfsObjectThumb) {
    this.model = model;
  }

  static wrap(model: IpfsObjectThumb) {
    return new IpfsObjectThumbModel(model);
  }
}
