import { Router } from 'express';
import { Session } from '@/models/session';
import { SessionStore } from './session.store';

/*
 * Debounced refresh was removed in favour of explicit expiry checks.
 * Previous version used:
import { debounce } from 'lodash';
 */

const store = new SessionStore();
export const sessionRouter = Router();

sessionRouter.get('/session/:id', async (req, res) => {
  const session: Session | undefined = await store.get(req.params.id);
  if (!session || session.expiresAt < Date.now()) {
    res.sendStatus(401);
    return;
  }
  res.json(session);
});
