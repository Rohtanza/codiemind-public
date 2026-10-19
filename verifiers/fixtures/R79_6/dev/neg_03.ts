interface IapiResponse<T> {
  data: T;
  status: number;
}

export async function getJson<T>(url: string): Promise<IapiResponse<T>> {
  const res = await fetch(url);
  const data = (await res.json()) as T;
  return { data, status: res.status };
}
