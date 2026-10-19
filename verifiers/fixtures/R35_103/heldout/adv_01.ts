import { format } from 'util';
import { format as fmt } from 'date-fns';

export function contractRenewalEmail(name: string, renewOn: Date): string {
  console.info(format('[mail] contract renewal queued for %s', name));
  return `${name}님, 안녕하십니까.
계약 갱신일은 ${fmt(renewOn, 'yyyy년 MM월 dd일')}입니다.
계속해서 저희 서비스를 이용해 주셔서 감사합니다.`;
}
