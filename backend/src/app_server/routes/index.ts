import * as express from 'express';
import * as path from 'path';
import * as cookieParser from 'cookie-parser';
import { cacheControlMiddleware, parseAuthorizationMiddleware, endPoint } from './lib';
import acl from '@/lib_common/acl';
import { UserRole } from '@prisma/client';
import env, { NodeEnvType } from '@/lib_common/env';

import * as GuestController from '@/app_server/controllers/guest';
import * as UserController from '@/app_server/controllers/user';
import * as UserRefreshController from '@/app_server/controllers/user_refresh';
import * as UserTokensOriginalController from '@/app_server/controllers/user_tokens_original';
import * as UserMarket from '@/app_server/controllers/user_market';
import * as UserFollow from '@/app_server/controllers/user_follow';
import * as UserHideOriginal from '@/app_server/controllers/user_hide_original';
import * as UserTridPartyTokens from '@/app_server/controllers/user_trid_party_tokens';
import * as MetamskController from '@/app_server/controllers/metamask';

import * as MarketController from '@/app_server/controllers/market';
import * as MarketLotsController from '@/app_server/controllers/market_lots';
import * as MarketHistoryController from '@/app_server/controllers/market_history';
import * as MarketActionsController from '@/app_server/controllers/market_actions';
import * as MarketCreateController from '@/app_server/controllers/market_create';
import * as MarketCreateImportController from '@/app_server/controllers/market_create_import';
import * as MarketUsersController from '@/app_server/controllers/market_users';

import * as IpfsSha256Controller from '@/app_server/controllers/ipfs_sha256';

import * as AdminSystemInfoController from '@/app_server/controllers/admin/system_info';
import * as AdminUserController from '@/app_server/controllers/admin/user';
import * as AdminOrgsController from '@/app_server/controllers/admin/orgs';
import * as AdminLotsController from '@/app_server/controllers/admin/lots';
import * as AdminFailTasksController from '@/app_server/controllers/admin/fail_tasks';

import DevRouter from '@/app_server/routes/dev';
import { getNftTokenForContract } from '@/app_server/controllers/contract_controller';
import { getPancakeswapData } from '../controllers/pancakeswap';

const cwd = process.cwd();

const router = express.Router();

router.use(express.urlencoded({ extended: false }));
router.use(express.json());
router.use(cookieParser());

router.use(
  '/api',
  (() => {
    const router = express.Router();

    router.use(cacheControlMiddleware);
    router.use(parseAuthorizationMiddleware);

    router.post('/refresh_token', endPoint(UserRefreshController.postUserRefreshToken));
    router.get('/pancakeswap', endPoint(getPancakeswapData));

    router.use(
      '/admin',
      (() => {
        const router = express.Router();

        const isAdmin = acl.allow(UserRole.ADMIN);
        const isAdminOrMod = acl.allow([UserRole.ADMIN, UserRole.MODERATOR]);

        router.get('/system_info', isAdmin, endPoint(AdminSystemInfoController.getSystemInfo));

        router.get('/users', isAdminOrMod, endPoint(AdminUserController.getFetchList));
        router.post('/users', isAdmin, endPoint(AdminUserController.create));
        router.get('/users/:id', isAdminOrMod, endPoint(AdminUserController.getById));
        router.post('/users/:id/ban', isAdminOrMod, endPoint(AdminUserController.postBanUser));
        router.post('/users/:id/unban', isAdminOrMod, endPoint(AdminUserController.postUnBanUser));
        router.post('/users/:id/set_featured_index', isAdminOrMod, endPoint(AdminUserController.postSetFeaturedIndex));

        router.get('/orgs', isAdminOrMod, endPoint(AdminOrgsController.getFetchOrgs));
        router.post('/orgs/:id/confirm', isAdminOrMod, endPoint(AdminOrgsController.orgConfirm));
        router.post('/orgs/:id/to_draft', isAdminOrMod, endPoint(AdminOrgsController.orgToDraft));
        router.post('/orgs/:id/delete', isAdminOrMod, endPoint(AdminOrgsController.orgDelete));
        router.post('/orgs/:id/reprocessing', isAdminOrMod, endPoint(AdminOrgsController.orgReProcessing));
        router.get('/orgs/:id', isAdminOrMod, endPoint(AdminOrgsController.getOrgById));

        router.get('/lots', isAdminOrMod, endPoint(AdminLotsController.getFetchLots));
        router.get('/lots/:id', isAdminOrMod, endPoint(AdminLotsController.getLotById));
        router.post('/lots/:id/toggle_is_top', isAdminOrMod, endPoint(AdminLotsController.postToggleIsTop));
        router.post('/lots/:id/close_auction', isAdminOrMod, endPoint(AdminLotsController.postCloseLot));

        router.get('/fail_tasks', isAdminOrMod, endPoint(AdminFailTasksController.getFetchFailedTasks));
        router.post('/fail_tasks/:id', isAdminOrMod, endPoint(AdminFailTasksController.postTaskRecover));
        router.delete('/fail_tasks/:id', isAdminOrMod, endPoint(AdminFailTasksController.deleteTask));

        return router;
      })(),
    );

    router.use(
      '/guest',
      (() => {
        const router = express.Router();

        router.use(acl.allow(UserRole.GUEST));

        /*
    router.post  ('/user_create', endPoint(GuestController.userCreate));
    router.post  ('/user_login', endPoint(GuestController.userLogin));
    router.get   ('/reset_password_info', endPoint(GuestController.resetPasswordInfo));
    router.get   ('/request_password_reset_link', endPoint(GuestController.requestPasswordResetLink));
    router.post  ('/reset_password', endPoint(GuestController.resetPassword));
    */

        router.post('/admin_login', endPoint(GuestController.userLogin));

        return router;
      })(),
    );

    router.use(
      '/user',
      (() => {
        const router = express.Router();
        router.use(acl.deny(UserRole.GUEST));

        router.get('', endPoint(UserController.getCurrent));
        router.post('/logout', endPoint(UserController.logout));
        router.get('/activate/:activateJwt', endPoint(UserController.activateJwt));
        router.post('/change_password', endPoint(UserController.changePassword));
        router.post('/settings_update', endPoint(UserController.settingsUpdate));

        // avatar
        router.post('/upload_avatar', UserController.uploadAvatarMiddleware, endPoint(UserController.uploadAvatar));
        router.delete('/avatar', endPoint(UserController.deleteUserAvatar));

        // background
        router.post(
          '/upload_background',
          UserController.uploadBackgroundMiddleware,
          endPoint(UserController.uploadBackground),
        );
        router.delete('/background', endPoint(UserController.deleteUserBackground));

        router.get(
          '/tokens_original/created',
          endPoint(UserTokensOriginalController.getFetchUserCreatedTokensOriginal),
        );
        router.get(
          '/tokens_original/collected',
          endPoint(UserTokensOriginalController.getFecthUserCollectedTokensOrigina),
        );
        router.delete('/tokens_original/:id', endPoint(UserTokensOriginalController.deleteTokenOriginalById));

        router.get('/hidden_originals', endPoint(UserHideOriginal.getFecthHiddenOriginals));
        router.post('/hidden_originals', endPoint(UserHideOriginal.postCreateHiddenOriginal));
        router.delete('/hidden_originals/:id', endPoint(UserHideOriginal.deleteHiddenOriginal));

        router.get('/lots', endPoint(UserMarket.getFetchUserLots));
        router.get('/lots/with_bets', endPoint(UserMarket.getFetchUserLotsWithBets));
        router.get('/lots/with_active', endPoint(UserMarket.getFetchUserLotsWithActive));
        router.get('/lots/:id', endPoint(UserMarket.getUserLotById));

        router.post('/following_put', endPoint(UserFollow.followingPut));
        router.post('/following_delete', endPoint(UserFollow.followingDelete));

        router.get('/bets', endPoint(UserMarket.getFetchUserBets));
        router.get('/tokens', endPoint(UserMarket.getFetchUserTokens));

        router.get('/trid_party_tokens', endPoint(UserTridPartyTokens.getUserTridPartyTokens));
        router.get('/get_owned_items', endPoint(UserTridPartyTokens.getOwnedItemsApi));

        return router;
      })(),
    );

    router.use(
      '/market',
      (() => {
        const router = express.Router();

        router.get(
          '/user_by_metaname_or_id/:metaname_or_id',
          endPoint(MarketUsersController.getMarketUserByMetanameOrId),
        );

        router.get('/featured_users', endPoint(MarketUsersController.getFeaturedUsers));

        router.get('/users', endPoint(MarketUsersController.getFetchMarketUsers));
        router.get('/users/:id', endPoint(MarketUsersController.getMarketUserById));
        router.get(
          '/users/:id/token_originals_created',
          endPoint(MarketUsersController.getFetchUserTokenOriginalsCreatedByUserId),
        );
        router.get(
          '/users/:id/token_originals_collected',
          endPoint(MarketUsersController.getFetchUserTokenOriginalsCollectedByUserId),
        );
        router.get('/users/:id/with_bets', endPoint(MarketUsersController.getFetchLotsWithBetsByUserId));
        router.get('/users/:id/lots_with_active', endPoint(MarketUsersController.getFetchLotsWithActiveByUserId));
        router.get('/users/:id/followers', endPoint(MarketUsersController.getFetchUserFollowers));
        router.get('/users/:id/followings', endPoint(MarketUsersController.getFetchUserFollowings));

        router.get('/top_lots', endPoint(MarketLotsController.getMarketTopLots));
        router.get('/lots', endPoint(MarketLotsController.getFetchMarketLots));
        router.get('/lots_from_followings', endPoint(MarketLotsController.getFetchMarketLotsFromFollowings));
        router.get('/lots/:id', endPoint(MarketLotsController.getMarketLotById));

        router.get('/categories', endPoint(MarketController.getMarketCategories));
        router.get('/bets', endPoint(MarketController.getFetchMarketBets));
        router.get('/tokens', endPoint(MarketController.getFetchMarketTokens));

        router.get('/tokens_original', endPoint(MarketController.getFetchTokensOriginal));
        router.get('/tokens_original/:id', endPoint(MarketController.getTokenOriginalById));

        router.get('/token_history', endPoint(MarketHistoryController.getFetchTokenHistory));

        return router;
      })(),
    );

    router.use(
      '/contract',
      (() => {
        const router = express.Router();

        router.get('/token/:id', endPoint(getNftTokenForContract));

        return router;
      })(),
    );

    router.use(
      '/market_actions',
      (() => {
        const router = express.Router();

        router.use(acl.deny(UserRole.GUEST));

        router.post('/place_a_bet', endPoint(MarketActionsController.postPlaceABet));

        router.post('/cancel_bet', endPoint(MarketActionsController.postBetCancel));

        router.post('/close_lot_action', endPoint(MarketActionsController.postCloseLotAction));

        router.post('/buy_lot_token', endPoint(MarketActionsController.buyLotToken));

        return router;
      })(),
    ); // 20211029140614_add_import_status_for_original

    router.use(
      '/market_create',
      (() => {
        const router = express.Router();
        router.use(acl.deny(UserRole.GUEST));

        router.post('/original', endPoint(MarketCreateController.createNewOriginal));
        router.post('/original/:id/update_draft', endPoint(MarketCreateController.updateDraftMarketOrg));
        router.post(
          '/original/:id/upload', // marketOrgId
          MarketCreateController.uploadContentMid,
          endPoint(MarketCreateController.uploadContent),
        );
        router.post('/original/:id/draft_complete', endPoint(MarketCreateController.draftComplete));

        router.post('/import', endPoint(MarketCreateImportController.importNft));

        router.post('/lot', endPoint(MarketCreateController.createLot));
        router.post('/lot_update', endPoint(MarketCreateController.auctionLotUpdate));

        return router;
      })(),
    );

    router.use(
      '/metamask',
      (() => {
        const router = express.Router();

        router.get('/message', endPoint(MetamskController.getUserMmMessageByMmAddress));
        router.post('/register', endPoint(MetamskController.userRegister));
        router.post('/login', endPoint(MetamskController.userLogin));

        return router;
      })(),
    );

    router.use((error, req, res, next) => {
      console.error(error);
      res.status(500).json({ code: 500 });
    });

    return router;
  })(),
);

router.head('/sha256/:sha256Param', endPoint(IpfsSha256Controller.headBySha256));
router.get('/sha256/:sha256Param', endPoint(IpfsSha256Controller.getBySha256));
router.head('/sha256/:sha256/:args', endPoint(IpfsSha256Controller.headBySha256AndArgs));
router.get('/sha256/:sha256/:args', endPoint(IpfsSha256Controller.getBySha256AndArgs));

if (env.NODE_ENV === NodeEnvType.development) {
  router.use('/dev', DevRouter);
}

if (env.DIR_FRONT_APP_ADMIN) {
  router.use('/admin', express.static(env.DIR_FRONT_APP_ADMIN));
  router.get('/admin*', (req, res, next) => {
    res.sendFile(path.resolve(env.DIR_FRONT_APP_ADMIN, 'index.html'));
  });
}

if (env.DIR_FRONT_APP_MAIN) {
  router.use('/', express.static(env.DIR_FRONT_APP_MAIN));
  router.get('/*', (req, res, next) => {
    res.sendFile(path.resolve(env.DIR_FRONT_APP_MAIN, 'index.html'));
  });
}

router.get('/404', (req, res, next) => {
  // trigger a 404 since no other middleware
  // will match /404 after this one, and we're not
  // responding here
  next();
});

router.use((error, req, res, next) => {
  console.error(error);
  res.status(500).send('');
});

export default router;
