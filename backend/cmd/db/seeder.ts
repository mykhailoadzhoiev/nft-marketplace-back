import * as fs from 'fs-extra';
import { resolve } from 'path';
import { endsWith } from 'lodash';
import prisma from '@/lib_db/prisma';

export default async function (argv) {
  const seedsDir = resolve(__dirname, 'seeds');
  const seedsFiles = await fs.readdir(seedsDir);

  const usedSeeds = await prisma.seed.findMany({
    orderBy: {
      id: 'asc',
    },
  });

  const usedSeedsMap = {} as { [seedName: string]: boolean };
  for (const usedSeedName of usedSeeds) {
    console.log(`used seed: ${usedSeedName.seed}`);
    usedSeedsMap[usedSeedName.seed] = true;
  }

  console.log('');

  for (const file of seedsFiles) {
    if (endsWith(file, '.ts')) {
      const seedName = file.replace(/(.*)\.ts$/, '$1');
      if (!usedSeedsMap[seedName]) {
        const seedBegin = require(resolve(seedsDir, file)).default;
        await seedBegin(prisma);

        console.log(`Use new seed: ${seedName}`);

        await prisma.seed.create({
          data: {
            seed: seedName,
          },
        });
      }
    }
  }

  await prisma.$disconnect();

  process.exit(0);
}
