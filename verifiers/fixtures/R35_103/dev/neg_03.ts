import { format } from 'date-fns';

export function subscriptionExpiryEmail(name: string, expiresOn: Date): string {
  return `${name}님, 안녕하십니까.
고객님의 구독이 ${format(expiresOn, 'yyyy-MM-dd')}에 만료될 예정입니다.
서비스를 계속 이용하시려면 구독을 갱신해 주시기 바랍니다.
감사합니다.`;
}
