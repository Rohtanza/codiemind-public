interface Profile {
  name: string;
  age: number;
}

export function userProfile(name: string, age: number): Profile {
  return { name, age };
}

export function printProfile(p: Profile): void {
  console.log(`${p.name} (${p.age})`);
}
