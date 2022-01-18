import prisma from '@/lib_db/prisma';
import { TokenHistoryType, TaskType, TokenOriginalStatus } from '@prisma/client';
import { taskCreate } from '@/lib_db/models/Task';

import * as _ from 'lodash';

import { contentProcessingForOrg } from '@/app_daemon/content_processing';
import { createTokensNFT } from '@/lib_common/web3';

export interface TaskDataOrg {
  orgId: string;
  isReprocessing?: boolean;
}

export async function taskWorkOrgProcessing(taskData: TaskDataOrg) {
  const org = await prisma.tokenOriginal.findFirst({
    where: {
      id: BigInt(taskData.orgId),
    },
  });

  if (taskData.isReprocessing) {
    await contentProcessingForOrg(org.id);
    return;
  }

  if (!org.itsProcessed) {
    await contentProcessingForOrg(org.id);

    await prisma.tokenOriginal.update({
      where: {
        id: org.id,
      },
      data: {
        itsProcessed: true,
      },
    });
  }

  await taskCreate(TaskType.ORG_TOKENS, taskData);
}

export async function taskWorkOrgTokens(taskData: TaskDataOrg) {
  const org = await prisma.tokenOriginal.findFirst({
    where: {
      id: BigInt(taskData.orgId),
    },
    include: {
      User: true,
    },
  });

  const tokensNftCount = await prisma.tokenNFT.count({
    where: {
      tokenOriginalId: org.id,
    },
  });

  const needCopies = org.copiesTotal - tokensNftCount;
  const tokenNftRes = await createTokensNFT({ amountOfCopies: needCopies, toAddress: org.User.metamaskAddress });

  for (let index = 0; index < tokenNftRes.length; index++) {
    const tokenNftId = tokenNftRes[index];

    const tokenNft = await prisma.tokenNFT.create({
      data: {
        userId: org.userId,
        tokenOriginalId: org.id,
        token: tokenNftId.toString(),
        index,
      },
    });
  }

  await prisma.tokenOriginal.update({
    where: {
      id: org.id,
    },
    data: {
      status: TokenOriginalStatus.PUBLISHED,
    },
  });

  await prisma.tokenHistory.create({
    data: {
      type: TokenHistoryType.ORG_PUBLISHED,
      tokenOriginalId: org.id,
    },
  });
}
