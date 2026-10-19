import express, { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '@/models/user';
import type { Order } from '@/models/order';
import { logger } from '@/shared/logger';
import { OrderService } from '@/modules/orders/order.service';
import { validateBody } from './middleware';
import { config } from '../config';

const router = express.Router();
const service = new OrderService(config.db);

const createSchema = z.object({ userId: z.string(), total: z.number() });

router.post('/orders', validateBody(createSchema), async (req: Request, res: Response) => {
  const user: User = await service.findUser(req.body.userId);
  const order: Order = await service.create(user, req.body.total);
  logger.info(`order ${order.id} created`);
  res.status(201).json(order);
});

export default router;
