function toKoreanDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}년 ${mm}월 ${dd}일`;
}

export function passwordResetEmail(userName: string, requestedAt: Date): string {
  return `${userName}님, 안녕하세요.

${toKoreanDate(requestedAt)}에 비밀번호 재설정 요청이 접수되었습니다.
본인이 요청하지 않으셨다면 고객센터로 문의해 주시기 바랍니다.

감사합니다.`;
}
