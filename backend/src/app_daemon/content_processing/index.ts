import prisma from '@/lib_db/prisma';
import { processingContentForImageTypeOrg } from './image';
import { processingContentForVideoTypeOrg } from './video';
import { TokenOriginalView } from 'src/lib_db/models/TokenOriginal';
import { MediaType } from '.prisma/client';
import { processingContentForAudioTypeOrg } from './audio';
import { imagesUserScope } from '@/lib_db/models/User';

export async function contentProcessingForOrg(orgId: bigint) {
  const org = await prisma.tokenOriginal.findFirst({
    where: {
      id: orgId,
    },
    include: {
      User: {
        include: {
          ...imagesUserScope(),
        },
      },
      TokenMedias: {
        include: {
          IpfsObject: true,
        },
      },
    },
  });

  const orgView = TokenOriginalView.getByModel(org);

  if (orgView.contentType === MediaType.IMAGE) {
    await processingContentForImageTypeOrg(orgView);
  } else if (orgView.contentType === MediaType.VIDEO) {
    await processingContentForVideoTypeOrg(orgView);
  } else if (orgView.contentType === MediaType.AUDIO) {
    await processingContentForAudioTypeOrg(orgView);
  }
}
