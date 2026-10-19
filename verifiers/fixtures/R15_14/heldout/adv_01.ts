type Row = { user_id: number; created_at: string };

export function describeRow(row: Row): string {
  const { user_id, created_at } = row;
  const createdDate = new Date(created_at);
  return `User ${user_id} joined on ${createdDate.toDateString()}`;
}
