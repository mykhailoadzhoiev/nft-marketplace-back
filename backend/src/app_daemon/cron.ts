import { LotSaleType, LotStatus, TaskType } from '@prisma/client';
import env, { SendEmailType, NodeRoleType } from '@/lib_common/env';
// import { mailerTransport, TaskSendEmailData } from '@/lib_common/mailer';
import { TaskWorkWrap } from '@/lib_db/models/Task';
import { TaskDataBuyTokenNft, TaskDataLotClose, taskWorkLotClose, taskWorkLotTokenNftBuy } from './tasks/Lot.tasks';
import { TaskDataOrg, taskWorkOrgProcessing, taskWorkOrgTokens } from './tasks/TokenOriginal.tasks';
import prisma from '@/lib_db/prisma';
import { closeLotAuctionByLotId } from '@/lib_db/models/Lot';
import { lotsViewsCounter, lotsViewsRatingDeflation } from './lib/lots_views_rating';
import { TaskOrgImportData, taskWorkOrgImport } from './tasks/TokenOriginalImport.task';

export default function InitCron() {
  if (env.NODE_ROLE === NodeRoleType.MASTER) {
    startQueueForOrgs();
    startQueueOrgImport();
    startQueueForLots();
    startQueueLotsWithTimer();
    startQueueLotsViewCounter();
    startQueueLotsViewsRatingDeflation();

    if (env.MAILER_SEND_EMAIL_TYPE === SendEmailType.task) {
      // startQueueMailerTask();
    }
  }
}

/*
function startQueueMailerTask () {
  const delayMs = env.MAILER_QUEUE_DELAY_SEC * 1000;

  async function handleQueue () {
    const taskWorkWrap = new TaskWorkWrap<TaskSendEmailData>([TaskType.SEND_EMAIL]);
    await taskWorkWrap.handleWrapFirst(async (ctx) => {
      await mailerTransport.sendMail(ctx.task.data);
    });

    setTimeout(handleQueue, delayMs);
  }

  setTimeout(handleQueue, delayMs);
}
*/

function startQueueForOrgs() {
  const delayMs = 15 * 1000;

  startQueue({
    name: 'orgs processing',
    handle: async () => {
      const taskWorkWrap = new TaskWorkWrap<TaskDataOrg>([TaskType.ORG_PROCESSING, TaskType.ORG_TOKENS], 3);
      taskWorkWrap.handleWrapFirst(async (ctx) => {
        if (ctx.task.type === TaskType.ORG_PROCESSING) {
          await taskWorkOrgProcessing(ctx.task.data);
        } else if (ctx.task.type === TaskType.ORG_TOKENS) {
          await taskWorkOrgTokens(ctx.task.data);
        }
      });
    },
    delayMs,
  });
}

function startQueueOrgImport() {
  const delayMs = 15 * 1000;

  startQueue({
    name: 'orgs import',
    handle: async () => {
      const taskWorkWrap = new TaskWorkWrap<TaskOrgImportData>([TaskType.ORG_IMPORT], 3);
      taskWorkWrap.handleWrapFirst(async (ctx) => {
        await taskWorkOrgImport(ctx.task.data);
      });
    },
    delayMs,
  });
}

function startQueueForLots() {
  const delayMs = 15 * 1000;

  startQueue({
    name: 'lots tasks',
    handle: async () => {
      const taskWorkWrap = new TaskWorkWrap<TaskDataLotClose | TaskDataBuyTokenNft>(
        [TaskType.LOT_POST_CLOSE, TaskType.LOT_BUY_TOKEN],
        3,
      );
      taskWorkWrap.handleWrapFirst(async (ctx) => {
        if (ctx.task.type === TaskType.LOT_POST_CLOSE) {
          await taskWorkLotClose(ctx.task.data as TaskDataLotClose);
        } else if (ctx.task.type === TaskType.LOT_BUY_TOKEN) {
          await taskWorkLotTokenNftBuy(ctx.task.data as TaskDataBuyTokenNft);
        }
      });
    },
    delayMs,
  });
}

function startQueueLotsWithTimer() {
  const delayMs = 15 * 1000;

  startQueue({
    name: 'lots auction close',
    handle: async () => {
      const lotsForClose = await prisma.lot.findMany({
        where: {
          isUseTimer: true,
          status: LotStatus.IN_SALES,
          saleType: LotSaleType.AUCTION,
          expiresAt: {
            lte: new Date(),
          },
        },
      });

      for (const lot of lotsForClose) {
        await closeLotAuctionByLotId(lot.id);
      }
    },
    delayMs,
  });
}

function startQueueLotsViewCounter() {
  const delayMs = 1000 * 60 * 5;

  startQueue({
    name: 'lots views counter',
    handle: async () => {
      await lotsViewsCounter();
    },
    delayMs,
  });
}

function startQueueLotsViewsRatingDeflation() {
  const delayMs = 1000 * 60 * 60;

  startQueue({
    name: 'lots views rating deflation',
    handle: async () => {
      await lotsViewsRatingDeflation();
    },
    delayMs,
  });
}

function startQueue(params: { name: string; handle: () => Promise<void>; delayMs: number }) {
  const handle = async () => {
    await params.handle();
    setTimeout(handle, params.delayMs);
  };
  setTimeout(handle, 0);
}
