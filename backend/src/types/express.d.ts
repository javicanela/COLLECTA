import type { AuthenticatedPrincipal } from '../services/authTypes';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedPrincipal;
    }
  }
}

export {};
