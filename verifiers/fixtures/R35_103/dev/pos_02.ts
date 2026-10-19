import { format } from 'date-fns';

const krw = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' });

export function invoiceEmail(customer: string, amount: number, dueDate: Date): string {
  return [
    `${customer} 고객님께,`,
    '',
    `청구 금액: ${krw.format(amount)}`,
    `납부 기한: ${format(dueDate, 'yyyy년 MM월 dd일')}`,
    '',
    '항상 저희 서비스를 이용해 주셔서 진심으로 감사드립니다.',
  ].join('\n');
}
