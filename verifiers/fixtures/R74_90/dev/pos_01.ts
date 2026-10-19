import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "@/lib/firebase";

const storage = getStorage(app);

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const avatarRef = ref(storage, `avatars/${userId}/${file.name}`);
  const snapshot = await uploadBytes(avatarRef, file, { contentType: file.type });
  return getDownloadURL(snapshot.ref);
}
