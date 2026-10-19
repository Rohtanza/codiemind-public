interface Config {
  retries: number;
}

export function run(config: Config): number {
  type Attempt = { index: number; ok: boolean };
  const attempts: Attempt[] = [];
  for (let i = 0; i < config.retries; i++) attempts.push({ index: i, ok: i % 2 === 0 });
  return attempts.filter((a) => a.ok).length;
}
