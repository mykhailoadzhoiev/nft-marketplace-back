import { RouteRecordRaw } from 'vue-router';
import { IsAdminOrModeratorGuard, IsNotAdminOrModeratorGuard } from './guards';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/Index.vue'),
      },
      {
        path: '/profile',
        component: () => import('pages/CurrentUser.vue'),
      },
      {
        path: '/orgs',
        component: () => import('pages/Orgs.vue'),
      },
      {
        path: '/orgs/:id',
        component: () => import('pages/Org.vue'),
      },
      {
        path: '/orgs_for_moderation',
        component: () => import('pages/OrgsForModeration.vue'),
      },
      {
        path: '/lots',
        component: () => import('pages/Lots.vue'),
      },
      {
        path: '/lots/:id',
        component: () => import('pages/Lot.vue'),
      },
      {
        path: '/users',
        component: () => import('pages/Users.vue'),
      },
      {
        path: '/users_featured',
        component: () => import('pages/UsersFeatured.vue'),
      },
      {
        path: '/users/:id',
        component: () => import('pages/User.vue'),
      },
      {
        path: '/fail_tasks',
        component: () => import('pages/FailTasks.vue'),
      },
      {
        path: 'logout',
        component: () => import('pages/auth/Logout.vue'),
      },
    ],
    meta: {
      guards: [IsAdminOrModeratorGuard],
    },
  },

  {
    path: '/auth',
    component: () => import('layouts/BlankLayout.vue'),
    children: [
      {
        path: 'login',
        component: () => import('pages/auth/Login.vue'),
      },
    ],
    meta: {
      guards: [IsNotAdminOrModeratorGuard],
    },
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/Error404.vue'),
  },
];

export default routes;
