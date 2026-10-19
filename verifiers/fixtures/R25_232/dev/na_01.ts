import { z } from 'zod';
import dayjs from 'dayjs';

export const eventSchema = z.object({
  title: z.string().min(1),
  startsAt: z.string().refine((s) => dayjs(s).isValid(), 'Invalid date'),
});

export type EventInput = z.infer<typeof eventSchema>;
