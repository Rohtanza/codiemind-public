interface Account {
  id: string;
  balance: number;
}

export function formatAccount({ id: account_id, balance }: Account): string {
  const formattedBalance = balance.toFixed(2);
  return `${account_id}: $${formattedBalance}`;
}
