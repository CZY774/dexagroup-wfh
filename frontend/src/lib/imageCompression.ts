const MAX_IMAGE_DIMENSION = 1280;
const MIN_BYTES_TO_COMPRESS = 700 * 1024;
const JPEG_QUALITY = 0.8;
const OUTPUT_MIME_TYPE = 'image/jpeg';

export type ImageCompressionResult = {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressed: boolean;
};

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

export async function compressProofPhoto(file: File): Promise<ImageCompressionResult> {
  if (!isSupportedImage(file)) {
    return unchanged(file);
  }

  let image: DecodedImage | null = null;
  try {
    image = await decodeImage(file);
    const dimensions = fitWithinBounds(image.width, image.height, MAX_IMAGE_DIMENSION);
    const shouldResize = dimensions.width !== image.width || dimensions.height !== image.height;
    const shouldCompress = file.size >= MIN_BYTES_TO_COMPRESS;

    if (!shouldResize && !shouldCompress) {
      return unchanged(file);
    }

    const blob = await renderToJpegBlob(image.source, dimensions.width, dimensions.height);
    if (!blob || blob.size >= file.size) {
      return unchanged(file);
    }

    const compressedFile = new File([blob], toJpegFilename(file.name), {
      type: OUTPUT_MIME_TYPE,
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      originalSize: file.size,
      compressedSize: compressedFile.size,
      compressed: true,
    };
  } finally {
    image?.close();
  }
}

function unchanged(file: File): ImageCompressionResult {
  return {
    file,
    originalSize: file.size,
    compressedSize: file.size,
    compressed: false,
  };
}

function isSupportedImage(file: File): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Unable to read proof photo.'));
    image.src = objectUrl;
  });

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close: () => URL.revokeObjectURL(objectUrl),
  };
}

function fitWithinBounds(width: number, height: number, maxDimension: number): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Unable to read proof photo dimensions.');
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function renderToJpegBlob(source: CanvasImageSource, width: number, height: number): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    return Promise.resolve(null);
  }

  context.drawImage(source, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(resolve, OUTPUT_MIME_TYPE, JPEG_QUALITY);
  });
}

function toJpegFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) {
    return 'proof-photo.jpg';
  }

  return trimmed.replace(/\.[^.]+$/, '') + '.jpg';
}
