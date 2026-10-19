const templates = {
  orderPlaced: (name, total, placedAt) =>
    `${name} 고객님, 주문해 주셔서 감사합니다.\n` +
    `주문 일자: ${placedAt.toISOString().split('T')[0]}\n` +
    `결제 금액: ${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(total)}`,
};

module.exports = templates;
