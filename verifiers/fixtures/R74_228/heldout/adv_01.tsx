import { Image as Photo } from "antd";

export function Preview({ url }: { url: string }) {
  return (
    <div className="preview">
      <Photo src={url} alt="Uploaded file" width={240} />
    </div>
  );
}
