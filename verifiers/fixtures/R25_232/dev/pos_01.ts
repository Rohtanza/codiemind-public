import { Router } from 'express';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/middleware/auth';
import type { User } from '@/types/user';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, async (req, res) => {
  const user: User | null = await prisma.user.findUnique({ where: { id: req.userId } });
  res.json(user);
});
