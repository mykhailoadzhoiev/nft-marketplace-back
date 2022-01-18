import { RouteLocationNormalized, NavigationGuardNext } from 'vue-router';

export interface IMiddlewareContext {
  to: RouteLocationNormalized;
  from: RouteLocationNormalized;
  next: NavigationGuardNext;
}

export interface IMiddleware {
  (context: IMiddlewareContext): Promise<void>;
}

export class GuardWrapper {
  public middleware: IMiddleware;

  constructor(middleware: IMiddleware) {
    this.middleware = middleware;
  }
}

export function guardsPipeline(context: IMiddlewareContext, guards: GuardWrapper[], index: number) {
  if (!guards || !guards[index]) {
    return context.next;
  }
  const nextMiddleware = guards[index].middleware;
  return async () => {
    const nextPipeline = guardsPipeline(context, guards, index + 1);
    await nextMiddleware({ ...context, next: nextPipeline });
  };
}

import { useStore } from '@/store';
import { UserRole } from '@/models/types';

export const IsAdminGuard = new GuardWrapper(async function ({ next }) {
  const store = useStore();
  const user = await store.auth.getUser();

  if (user && user.role === UserRole.Admin) {
    next();
  } else {
    next({ path: '/auth/login' });
  }
});

export const IsAdminOrModeratorGuard = new GuardWrapper(async function ({ next }) {
  const store = useStore();
  const user = await store.auth.getUser();

  if (user && [UserRole.Admin, UserRole.Moderator].indexOf(user.role) !== -1) {
    next();
  } else {
    next({ path: '/auth/login' });
  }
});

export const IsNotAdminOrModeratorGuard = new GuardWrapper(async function ({ next }) {
  const store = useStore();
  const user = await store.auth.getUser();

  if (user && [UserRole.Admin, UserRole.Moderator].indexOf(user.role) !== -1) {
    next({ path: '/' });
  } else {
    store.auth.logout();
    next();
  }
});
