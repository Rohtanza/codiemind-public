export class UserService {
  private cache = new Map<string, string>();

  getUser(id: string) { return this.cache.get(id); }
  saveUser(id: string, name: string) { this.cache.set(id, name); }
  deleteUser(id: string) { this.cache.delete(id); }
  listUsers() { return [...this.cache.values()]; }
  countUsers() { return this.cache.size; }
  sendEmail(id: string, msg: string) { console.log(`mail ${id}: ${msg}`); }
  exportCsv() { return [...this.cache.entries()].map(([k, v]) => `${k},${v}`).join("\n"); }
  validateName(name: string) { return name.trim().length > 0; }
  hashPassword(pw: string) { return pw.split("").reverse().join(""); }
  logActivity(id: string) { console.log(`activity ${id}`); }
}
