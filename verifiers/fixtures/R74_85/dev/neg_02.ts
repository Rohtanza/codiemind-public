import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function recordOrder(orderId: string, total: number): Promise<void> {
  await pool.query(
    "INSERT INTO orders (id, total, status) VALUES ($1, $2, 'pending')",
    [orderId, total],
  );
}
