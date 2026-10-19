export class DateUtils {
  static today(): Date { return new Date(); }
  static addDays(d: Date, n: number): Date { return new Date(d.getTime() + n * 86400000); }
  static isWeekend(d: Date): boolean { return d.getDay() === 0 || d.getDay() === 6; }
  static toIso(d: Date): string { return d.toISOString().slice(0, 10); }
  public static parse(s: string): Date { return new Date(s); }
  static async fetchHolidays(year: number): Promise<string[]> { return [`${year}-01-01`]; }
  formatShort(d: Date): string { return d.toLocaleDateString(); }
  public formatLong(d: Date): string { return d.toDateString(); }
  diffInDays(a: Date, b: Date): number { return Math.round((b.getTime() - a.getTime()) / 86400000); }
  async isHoliday(d: Date): Promise<boolean> {
    return (await DateUtils.fetchHolidays(d.getFullYear())).includes(DateUtils.toIso(d));
  }
  private pad(n: number): string { return String(n).padStart(2, "0"); }
}
