import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({ region: "eu-west-1" });

// Same signature as the Firebase helper so callers did not need to change.
async function uploadBytes(path: string, data: Uint8Array) {
  return client.send(new PutObjectCommand({ Bucket: "ugc", Key: path, Body: data }));
}

export async function uploadAvatar(userId: string, data: Uint8Array) {
  await uploadBytes(`avatars/${userId}.png`, data);
}
