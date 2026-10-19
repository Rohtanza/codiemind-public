export async function fetchProfile(userId: string) {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  const profile = await res.json();
  return profile;
}
