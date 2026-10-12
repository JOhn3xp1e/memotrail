const COMPRESSION_THRESHOLD = 4 * 1024 * 1024;
const MAX_DIMENSION = 2560;

export async function preparePhoto(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`${file.name} could not be opened as an image.`);
  }

  try {
    if (
      file.size <= COMPRESSION_THRESHOLD ||
      file.type === "image/gif" ||
      (bitmap.width <= MAX_DIMENSION && bitmap.height <= MAX_DIMENSION)
    ) {
      return file;
    }

    const scale = Math.min(
      MAX_DIMENSION / bitmap.width,
      MAX_DIMENSION / bitmap.height,
      1,
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo compression is unavailable.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const compressed = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error(`${file.name} could not be compressed.`)),
        "image/jpeg",
        0.86,
      );
    });
    const extension = file.name.replace(/\.[^.]+$/, "");
    return new File([compressed], `${extension}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}
