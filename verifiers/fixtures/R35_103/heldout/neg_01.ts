import moment from 'moment';

export const interviewEmail = (candidate: string, at: Date) => `
${candidate}님, 안녕하십니까.
면접 일정이 ${moment(at).format('MMMM D, YYYY')}로 확정되었음을 안내드립니다.
당일 신분증을 지참해 주시기 바랍니다.
감사합니다.`;
