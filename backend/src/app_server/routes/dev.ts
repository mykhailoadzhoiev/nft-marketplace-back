import * as express from 'express';
import * as FakeData from '@/app_server/lib/fake';
import * as ejs from 'ejs';
import prisma from '@/lib_db/prisma';
import { redisBase } from '@/lib_common/redis/base';
import * as _ from 'lodash';
import * as pug from 'pug';
import * as path from 'path';

const router = express.Router();

async function getImagesSha256() {
  const redis = redisBase.getClient();

  const rendomImagesSha256 = await redis.get('dev:random_images');

  if (rendomImagesSha256) {
    const randomImagesArray = JSON.parse(rendomImagesSha256);
    return randomImagesArray;
  }

  const imagesIpfsObjects = await prisma.ipfsObject.findMany({
    where: {
      type: 'IMAGE',
    },
  });
  const arr = imagesIpfsObjects.map((v) => v.sha256);
  await redis.set('dev:random_images', JSON.stringify(arr), ['EX', 180]);

  return arr;
}

router.get('/new_random_image', async (req, res) => {
  const randomImageIpfsObject = await FakeData.createFakeImageIpfsObject();
  res.redirect('/sha256/' + randomImageIpfsObject.sha256);
});

router.get('/random_ipfs_image', async (req, res) => {
  const imagesSha256 = await getImagesSha256();
  const randsSha256 = _.sample(imagesSha256);
  res.redirect('/sha256/' + randsSha256);
});

router.get('/pug_random_images', async (req, res) => {
  const imagesIpfsObjects = await prisma.ipfsObject.findMany({
    where: {
      type: 'IMAGE',
      isThumb: false,
    },
  });

  const imagessSrcForTemplater = [];

  for (const ipfsObject of imagesIpfsObjects) {
    let url = '/sha256/' + ipfsObject.sha256;

    if (_.random(0, 100) < 20) {
      imagessSrcForTemplater.push(url + ':32');
    }

    if (_.random(0, 100) < 20) {
      imagessSrcForTemplater.push(url + ':64');
    }

    if (_.random(0, 100) < 20) {
      imagessSrcForTemplater.push(url + ':128');
    }

    if (_.random(0, 100) < 20) {
      imagessSrcForTemplater.push(url + ':256');
    }

    if (_.random(0, 100) < 20) {
      imagessSrcForTemplater.push(url + ':512');
    }

    imagessSrcForTemplater.push(url);
  }

  const compileFunction = pug.compileFile(path.resolve('src', 'views', 'dev', 'random_images.pug'));

  res.send(
    compileFunction({
      images: imagessSrcForTemplater,
    }),
  );
});

export default router;
