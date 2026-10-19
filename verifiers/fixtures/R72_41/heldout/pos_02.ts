export async function sendInvite(email: string): Promise<void> {
  await fetch("/api/invite", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export const parseDate = function (input: string): Date {
  const [y, m, d] = input.split("-").map(Number);
  return new Date(y, m - 1, d);
};
