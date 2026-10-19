function format(d: Date, _pattern: string): string {
  return d.toISOString().slice(0, 10);
}

export function eventReminderEmail(name: string, eventDate: Date): string {
  const when = format(eventDate, 'yyyy년 MM월 dd일');
  return `${name}님, 안녕하십니까.
신청하신 행사가 ${when}에 진행됩니다.
잊지 말고 참석해 주시기 바랍니다.`;
}
