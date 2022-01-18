import { route } from 'quasar/wrappers';
import VueRouter from 'vue-router';
import { createMemoryHistory, createRouter, createWebHashHistory, createWebHistory } from 'vue-router';
import { guardsPipeline, GuardWrapper } from './guards';

import routes from './routes';

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
    ? createWebHistory
    : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.MODE === 'ssr' ? void 0 : process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach(async (to, from, next) => {
    const allGuards = [] as GuardWrapper[];
    for (const math of to.matched) {
      if (!math.meta || !math.meta.guards) {
        continue;
      }
      const guards = math.meta.guards as GuardWrapper[];
      for (const gurad of guards) {
        allGuards.push(gurad);
      }
    }

    if (allGuards.length === 0) {
      return next();
    }

    const context = {
      to,
      from,
      next,
    };
    return await allGuards[0].middleware({
      ...context,
      next: guardsPipeline(context, allGuards, 1),
    });
  });

  return Router;
});
