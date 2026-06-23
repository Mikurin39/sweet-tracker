/**
 * Downscale + compress an image file to a JPEG Blob (client-side).
 * Caps the long edge to control upload size and vision token cost.
 */
export async function compressImage(
  file: File,
  maxEdge = 1600,
  quality = 0.8,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("この端末では画像処理に対応していません");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("画像の変換に失敗しました")),
      "image/jpeg",
      quality,
    );
  });
}
