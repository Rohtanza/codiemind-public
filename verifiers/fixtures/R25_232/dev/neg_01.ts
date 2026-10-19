import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const postsRouter = Router();

postsRouter.get('/', requireAuth, async (_req, res) => {
  const posts = await prisma.post.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(posts);
});
