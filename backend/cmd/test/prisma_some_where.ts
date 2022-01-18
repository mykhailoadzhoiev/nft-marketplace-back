import prisma from '@/lib_db/prisma';

export default async function (argv: { _: string[] }) {
  const userId = BigInt(argv._[1]);

  const res = await prisma.lot.findMany({
    where: {
      LotTokens: {
        some: {
          TokenNFT: {
            userId: userId,
          },
        },
      },
    },
    include: {
      TokenOriginal: {
        include: {
          TokenMedias: {
            include: {
              IpfsObject: true,
            },
          },
          TokensNFT: {
            where: {
              userId: userId,
            },
          },
        },
      },
    },
  });

  console.log(res);

  process.exit(0);
}
