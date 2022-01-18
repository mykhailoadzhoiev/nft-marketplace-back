import { UserJwt } from './lib_db/models/User';

declare global {
  namespace Express {
    interface Request {
      authorization: UserJwt | null;
      language: string | undefined;
    }
  }
}
