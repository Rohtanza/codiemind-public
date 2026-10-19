export enum Status {
  Active = "active",
  Disabled = "disabled",
}

export interface Account {
  id: string;
  status: Status;
}

export async function fetchAccount(id: string): Promise<Account> {
  const response: Response = await fetch(`/api/accounts/${id}`);
  const body: Account = (await response.json()) as Account;
  return body;
}
