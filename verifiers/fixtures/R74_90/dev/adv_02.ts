import { getStorage } from "firebase-admin/storage";

export async function storeUserVideo(userId: string, tmpPath: string) {
  const bucket = getStorage().bucket("my-app.appspot.com");
  const [file] = await bucket.upload(tmpPath, {
    destination: `videos/${userId}/${Date.now()}.mp4`,
    metadata: { contentType: "video/mp4" },
  });
  return file.name;
}
