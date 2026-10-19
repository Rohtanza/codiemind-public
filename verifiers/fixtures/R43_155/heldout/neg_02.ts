export const deleteRecord = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
    return res.ok;
  } catch (
    networkError
  ) {
    console.error("delete failed", networkError);
    return false;
  }
};
