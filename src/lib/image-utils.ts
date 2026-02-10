/**
 * Client-side image preparation for API calls.
 * Resizes large images using Canvas to stay within provider base64 limits.
 */

const MAX_BASE64_BYTES = 4 * 1024 * 1024; // 4MB base64 (safe under 5MB API limits)
const MAX_DIMENSION = 2048; // Max width/height for AI vision APIs

/**
 * Prepare an image data URL for API consumption.
 * Resizes and compresses if the base64 payload exceeds the limit.
 * Returns the original data URL if already small enough.
 */
export function prepareImageForAPI(
  dataUrl: string,
  maxBytes: number = MAX_BASE64_BYTES
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const base64Part = dataUrl.split(",")[1] || "";
      const needsResize = width > MAX_DIMENSION || height > MAX_DIMENSION;
      const needsCompress = base64Part.length > maxBytes;

      // Already small enough and dimensions OK — pass through
      if (!needsResize && !needsCompress) {
        resolve(dataUrl);
        return;
      }

      // Scale down to MAX_DIMENSION
      if (needsResize) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      // Try JPEG at decreasing quality until under limit
      let quality = 0.85;
      let result = canvas.toDataURL("image/jpeg", quality);

      while (result.split(",")[1].length > maxBytes && quality > 0.3) {
        quality -= 0.1;
        result = canvas.toDataURL("image/jpeg", quality);
      }

      // If still too large, halve dimensions and try again
      if (result.split(",")[1].length > maxBytes) {
        canvas.width = Math.round(width * 0.5);
        canvas.height = Math.round(height * 0.5);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        result = canvas.toDataURL("image/jpeg", 0.7);
      }

      console.log(
        `[image-utils] Resized: ${img.naturalWidth}x${img.naturalHeight} → ${canvas.width}x${canvas.height}, ` +
        `base64: ${(base64Part.length / 1024 / 1024).toFixed(1)}MB → ${(result.split(",")[1].length / 1024 / 1024).toFixed(1)}MB`
      );

      resolve(result);
    };
    img.onerror = () => reject(new Error("Failed to load image for resizing"));
    img.src = dataUrl;
  });
}
