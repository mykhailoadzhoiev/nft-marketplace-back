import { Request, Response } from 'express';
import prisma from '@/lib_db/prisma';
import env from '@/lib_common/env';
import { paramsIdValidation } from '../lib/id_param_validation';
import { ExErrorsTmp, ThrowExError } from '@/lib_common/ex_errors';

export async function getNftTokenForContract(req: Request, res: Response) {
  const paramsIdValRes = await paramsIdValidation(req.params);
  if (paramsIdValRes.isErrored()) {
    return paramsIdValRes.throwEx(res);
  }
  const tokenNftId = req.params['id'];

  const nft = await prisma.tokenNFT.findFirst({
    where: {
      token: tokenNftId,
    },
    include: {
      TokenOriginal: {
        include: {
          TokenMedias: {
            include: {
              IpfsObject: true,
            },
          },
        },
      },
    },
  });

  if (!nft) {
    return ThrowExError(res, ExErrorsTmp.TokenNft.NotFound);
  }

  const image = nft?.TokenOriginal.TokenMedias?.find((m) => m.isOriginal);
  res.json({
    name: nft?.TokenOriginal?.name || '',
    description: nft?.TokenOriginal?.description || '',
    image: `${env.NODE_PROTOCOL}//${env.NODE_HOST}/sha256/${image?.IpfsObject.sha256}`,
    attributes: {
      copy: nft.index,
      total_copies: nft.TokenOriginal.copiesTotal,
    },
  });
}
