import { getStorage, ref, uploadBytes } from "firebase/storage";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});

export async function uploadPost(userId: string, image: Blob, thumbnail: Uint8Array) {
  await uploadBytes(ref(getStorage(), `posts/${userId}/image`), image);
  await s3.send(
    new PutObjectCommand({ Bucket: "thumbs", Key: `${userId}/thumb.jpg`, Body: thumbnail })
  );
}
