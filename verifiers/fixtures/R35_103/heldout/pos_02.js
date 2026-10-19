function formatWon(value) {
  return `${value.toLocaleString('ko-KR')}원`;
}

module.exports.refundEmail = function refundEmail(customer, refundAmount) {
  return {
    subject: '[환불 안내] 환불이 완료되었습니다',
    html: `<p>${customer} 고객님께,</p>
<p>요청하신 환불 금액 ${formatWon(refundAmount)}이 정상적으로 처리되었습니다.</p>
<p>이용해 주셔서 감사합니다.</p>`,
  };
};
