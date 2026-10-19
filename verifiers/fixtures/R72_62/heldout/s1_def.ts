// class Admin extends User was replaced by composition
class User { constructor(public name: string) {} }
export class Admin {
  constructor(private user: User) {}
}
