import { UserRole } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { ExErrorsTmp, ThrowExError } from './ex_errors';

function checkAccess(data: UserRole[] | UserRole, isAllow?: boolean) {
  let roles = Array.isArray(data) ? data : [data];

  return (req: Request, res: Response, next: NextFunction) => {
    let access = false;
    if (!req) {
      return;
    }

    if (!roles.length) {
      access = true;
    } else {
      let role = UserRole.GUEST as UserRole;

      if (req.authorization) {
        role = req.authorization.role;
      }

      if (isAllow) {
        access = roles.indexOf(role) !== -1;
      } else {
        access = roles.indexOf(role) === -1;
      }
    }

    if (access) {
      next();
    } else {
      denyAction(req, res);
    }
  };
}

function denyAction(req: Request, res: Response) {
  if (req.authorization) {
    return ThrowExError(res, ExErrorsTmp.Common.Forbidden);
  } else {
    return ThrowExError(res, ExErrorsTmp.Common.Unauthorized);
  }
}

function allow(roles: UserRole[] | UserRole) {
  return checkAccess(roles, true);
}

function deny(roles: UserRole[] | UserRole) {
  return checkAccess(roles, false);
}

export default {
  allow,
  deny,
};
