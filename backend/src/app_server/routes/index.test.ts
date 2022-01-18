import * as request from 'supertest';
import app from '@/app_server/app';
import prisma from '@/lib_db/prisma';
import { UserModel } from '@/lib_db/models/User';
import * as bcrypt from '@/lib_common/bcrypt';
import Bs58 from '@/lib_common/bs58';

xtest('test refresh', async () => {
  request(app)
    .post('/api/refresh_token')
    .send({
      refreshToken: '',
    })
    .then((res) => {
      expect(res.status).toEqual(404);
      expect(res.text).toEqual('not found');
    });
});

xtest('test create admin and login', async () => {
  const adminEmail = `admin-${Bs58.uuid()}@exapmle.com`;
  const adminPassword = 'password';
  const user = await UserModel.createUser(adminEmail, adminPassword, {
    role: 'ADMIN',
    name: 'Admin Power',
    emailActivatedAt: new Date(),
  });
  const userId = user.id.toString();

  await request(app)
    .post('/api/guest/admin_login')
    .send({
      email: adminEmail,
      password: adminPassword,
    })
    .expect(200)
    .then((res) => {
      expect(res.body.user.id).toEqual(userId);
      expect(res.body.user.email).toEqual(adminEmail);
    });
});

xtest('test close lot auction', async () => {
  const lot = await prisma.lot.findFirst({
    where: {
      status: 'IN_SALES',
    },
  });

  const user = await prisma.user.findFirst({
    where: {
      id: lot.userId,
    },
  });

  const userModel = UserModel.wrap(user);
  const authorization = await userModel.generateAuthorizationForUser();

  await request(app)
    .post('/api/market_actions/close_lot_action')
    .set('Authorization', `Bearer ${authorization.token}`)
    .send({
      lotId: lot.id.toString(),
    })
    .then((res) => {
      console.log(res.body, res.text);
    });
});
