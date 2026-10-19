import { getStorage, ref, uploadString } from "firebase/storage";

export async function saveDrawing(userId: string, canvas: HTMLCanvasElement) {
  const dataUrl = canvas.toDataURL("image/png");
  const drawingRef = ref(getStorage(), `drawings/${userId}/${crypto.randomUUID()}.png`);
  const result = await uploadString(drawingRef, dataUrl, "data_url");
  return result.metadata.fullPath;
}
