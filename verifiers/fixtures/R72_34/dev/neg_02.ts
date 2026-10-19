export const fetchUser = async (id: string) => {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  return res.json();
};
