// Older version used `catch (err) {` here; we now annotate the binding.
export function readToken(storage: Storage): string | null {
  try {
    return storage.getItem("token");
  } catch (err: unknown) {
    console.error("storage unavailable", err);
    return null;
  }
}
