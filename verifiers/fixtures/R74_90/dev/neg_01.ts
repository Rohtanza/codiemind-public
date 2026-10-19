import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" });

export async function uploadAvatar(userId: string, body: Buffer, contentType: string) {
  const key = `avatars/${userId}.png`;
  await s3.send(
    new PutObjectCommand({ Bucket: "user-uploads", Key: key, Body: body, ContentType: contentType })
  );
  return key;
}
