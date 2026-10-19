export interface Repo {
  name: string;
  stargazers_count: number;
}

export async function listRepos(user: string): Promise<Repo[]> {
  const res = await fetch(`https://api.github.com/users/${user}/repos`);
  if (!res.ok) throw new Error("GitHub request failed");
  return (await res.json()) as Repo[];
}
