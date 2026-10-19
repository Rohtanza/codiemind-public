export function shippingNoticeEmail(name: string, shippedAt: Date): string {
  const shipped = shippedAt.toLocaleDateString('en-US');
  return `${name} 고객님, 안녕하십니까.

주문하신 상품이 ${shipped}에 발송되었습니다.
배송 조회는 마이페이지에서 확인하실 수 있습니다.

감사합니다.`;
}
