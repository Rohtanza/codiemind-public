import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

class MediaStore {
  constructor(private client = new S3Client({}), private bucket = "media") {}

  async uploadBytes(key: string, body: Uint8Array, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
    return key;
  }
}

const store = new MediaStore();

export const uploadAttachment = (userId: string, body: Uint8Array) =>
  store.uploadBytes(`attachments/${userId}`, body, "application/pdf");
