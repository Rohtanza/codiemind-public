import { format } from 'date-fns';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function paymentReceiptEmail(name: string, paid: number, paidAt: Date) {
  return {
    subject: '[결제 완료] 결제가 정상적으로 처리되었습니다',
    text: `${name}님, 결제해 주셔서 감사합니다.
결제 일자: ${format(paidAt, 'yyyy년 MM월 dd일')}
결제 금액: ${money.format(paid)}`,
  };
}
