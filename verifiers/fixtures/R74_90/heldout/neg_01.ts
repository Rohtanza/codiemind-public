import { put } from "@vercel/blob";

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const file = form.get("file") as File;
  const blob = await put(`uploads/${file.name}`, file, { access: "public" });
  return Response.json({ url: blob.url });
}
