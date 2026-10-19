import { format } from 'date-fns';

export interface MeetingInvite {
  recipientName: string;
  meetingDate: Date;
}

export function buildMeetingInviteEmail(invite: MeetingInvite): { subject: string; body: string } {
  const dateText = format(invite.meetingDate, 'yyyy년 MM월 dd일');
  return {
    subject: `[회의 안내] ${dateText} 정기 회의`,
    body: `${invite.recipientName}님, 안녕하십니까.\n\n${dateText}에 정기 회의가 예정되어 있습니다.\n참석 부탁드립니다.\n\n감사합니다.`,
  };
}
