import dayjs from 'dayjs';
import {
  formatDuration,
  parseDuration,
} from '@/shared/time';
import type {
  Shift,
  ShiftKind,
} from '@/models/shift';

export function shiftLength(shift: Shift, kind: ShiftKind): string {
  const minutes = dayjs(shift.end).diff(shift.start, 'minute');
  const grace = kind === 'night' ? parseDuration('15m') : 0;
  return formatDuration(minutes + grace);
}
