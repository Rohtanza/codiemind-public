import { getStorage } from "firebase-admin/storage";
import type { Request, Response } from "express";

export async function saveAttachment(req: Request, res: Response) {
  const bucket = getStorage().bucket();
  const name = `attachments/${req.params.userId}/${Date.now()}.bin`;
  await bucket.file(name).save(req.body as Buffer, {
    contentType: req.headers["content-type"] ?? "application/octet-stream",
  });
  res.status(201).json({ path: name });
}
