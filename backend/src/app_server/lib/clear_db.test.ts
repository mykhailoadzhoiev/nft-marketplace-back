import prisma from '@/lib_db/prisma';
import * as FakeData from './fake';
import { deleteLotByLotId } from './clear_db';

test('create and delete fake lot', async () => {
  const fakeLot = await FakeData.createFakeLot();

  const resCode = await deleteLotByLotId(fakeLot.id);

  expect(resCode).toEqual(1000);
});

test('create two lots of one org and deletes', async () => {
  const fakeTokenOriginal = await FakeData.createFakeTokenOrigin();
  const betUsers = await FakeData.createFakeUsers(2);

  const fakeLot1 = await FakeData.createFakeLot({
    tokenOriginal: fakeTokenOriginal,
    betUsers,
  });
  const fakeLot2 = await FakeData.createFakeLot({
    tokenOriginal: fakeTokenOriginal,
    betUsers,
  });

  const resCode1 = await deleteLotByLotId(fakeLot1.id);
  expect(resCode1).toEqual(1001);
  const resCode2 = await deleteLotByLotId(fakeLot2.id);
  expect(resCode2).toEqual(1000);
});
