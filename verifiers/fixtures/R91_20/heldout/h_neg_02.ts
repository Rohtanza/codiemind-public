import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@/db";

export async function login(email: string, password: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}
