import type { Request, Response, NextFunction } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID!,
  tokenUse: "access",
  clientId: process.env.CLIENT_ID!,
});

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) return res.status(401).end();
  try {
    res.locals.user = await verifier.verify(token);
    next();
  } catch {
    res.status(401).end();
  }
}
