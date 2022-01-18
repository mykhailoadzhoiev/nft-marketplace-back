import { User, Lot } from '@prisma/client';
import { appInit } from '@/app_server/app';
import prisma from '@/lib_db/prisma';
import * as FakeData from '@/app_server/lib/fake';

let betUsers: User[];

async function createRandomLots(count = 10) {
  const lots = [] as Lot[];

  for (let n = 0; n < count; n++) {
    const newLot = await FakeData.createFakeLot({
      betUsers: betUsers,
    });

    lots.push(newLot);
  }
}

export default async function (argv) {
  await appInit();

  const fakeUsersCount = parseInt(argv.fusers) || 5;
  const fakeLotsCount = parseInt(argv.flots) || 5;

  console.log('--fusers', fakeUsersCount);
  console.log('--flots', fakeLotsCount);

  betUsers = await FakeData.createFakeUsers(fakeUsersCount);
  await createRandomLots(fakeLotsCount);

  prisma.$disconnect();
  process.exit(0);
}
