export interface ProcessedImage {
  dataUrl: string;
  base64: string;
  width: number;
  height: number;
  aspectRatio: number;
  extension: 'webp' | 'jpg' | 'png';
}

/**
 * Reads an uploaded image file, automatically calculates natural dimensions,
 * optionally constrains resolution to maxDimension (default 2400px),
 * and converts to genuine WebP format via HTML5 Canvas.
 */
export function processImageFile(file: File, maxDimension = 2400): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El formato de la imagen no es compatible.'));
      img.onload = () => {
        let width = img.naturalWidth || img.width || 2000;
        let height = img.naturalHeight || img.height || 2000;

        let targetWidth = width;
        let targetHeight = height;

        if (targetWidth > maxDimension || targetHeight > maxDimension) {
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
            targetWidth = maxDimension;
          } else {
            targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
            targetHeight = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          const rawData = reader.result as string;
          const rawBase64 = rawData.split(',')[1];
          const rawExt = (file.name.split('.').pop()?.toLowerCase() || 'jpg') as any;
          return resolve({
            dataUrl: rawData,
            base64: rawBase64,
            width,
            height,
            aspectRatio: width / height,
            extension: rawExt,
          });
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        let dataUrl = canvas.toDataURL('image/webp', 0.88);
        let extension: 'webp' | 'jpg' = 'webp';

        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          extension = 'jpg';
        }

        const base64 = dataUrl.split(',')[1];

        resolve({
          dataUrl,
          base64,
          width: targetWidth,
          height: targetHeight,
          aspectRatio: targetWidth / targetHeight,
          extension,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
