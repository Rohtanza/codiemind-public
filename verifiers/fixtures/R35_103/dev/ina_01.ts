export function welcomeEmail(name: string): { subject: string; body: string } {
  return {
    subject: '회원 가입을 진심으로 환영합니다',
    body: `${name}님, 안녕하십니까.

저희 서비스에 가입해 주셔서 진심으로 감사드립니다.
궁금하신 점이 있으시면 언제든지 문의해 주시기 바랍니다.

감사합니다.`,
  };
}
