import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" });

export async function uploadReport(key: string, body: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.REPORTS_BUCKET,
      Key: key,
      Body: body,
      ContentType: "text/csv",
    }),
  );
}
