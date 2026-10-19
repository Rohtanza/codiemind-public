import {
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type {
  Customer,
  CustomerStatus,
} from '@/models/customer';
import {
  assertNever,
  toIsoDate,
} from '@/shared/utils';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { mapStatus } from '../mappers/status';

@Entity()
export class CustomerSnapshot {
  @PrimaryGeneratedColumn() id!: number;

  static from(c: Customer, status: CustomerStatus, notify: NotificationsModule) {
    if (status === 'banned') notify.alert(c.id);
    else if (status !== 'active' && status !== 'pending') assertNever(status as never);
    return { id: c.id, status: mapStatus(status), at: toIsoDate(new Date()) };
  }
}
