interface User {
  id: number;
  displayName: string;
}

export const fetchUser = async (userId: number, baseUrl = "/api"): Promise<User> => {
  const response = await fetch(`${baseUrl}/users/${userId}`);
  const { id, displayName } = (await response.json()) as User;
  return { id, displayName };
};
