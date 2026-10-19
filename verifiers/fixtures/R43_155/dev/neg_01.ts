export async function getUser(id: number) {
  try {
    const res = await fetch(`/api/users/${id}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}
