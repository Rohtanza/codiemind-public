import React from 'react';
import dayjs from 'dayjs';

type Props = { name: string; reservedAt: Date };

export function ReservationConfirmEmail({ name, reservedAt }: Props) {
  return (
    <div>
      <p>{name} 고객님, 안녕하십니까.</p>
      <p>예약 일자: {dayjs(reservedAt).format('YYYY년 MM월 DD일')}</p>
      <p>예약해 주셔서 진심으로 감사드립니다.</p>
    </div>
  );
}
