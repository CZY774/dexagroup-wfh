const TARGET_MAX_BYTES = 1_500_000;
const MAX_ORIGINAL_BYTES = 12 * 1024 * 1024;
const MIN_BYTES_TO_COMPRESS = 500 * 1024;
const MAX_IMAGE_DIMENSIONS = [1280, 1120, 960, 800];
const JPEG_QUALITIES = [0.82, 0.76, 0.7, 0.64];
const OUTPUT_MIME_TYPE = 'image/jpeg';

export type ImageCompressionResult = {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressed: boolean;
};

export class ImageCompressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageCompressionError';
  }
}

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

export async function compressProofPhoto(file: File): Promise<ImageCompressionResult> {
  if (!isSupportedImage(file)) {
    throw new ImageCompressionError('Proof photo must be a JPEG, PNG, or WEBP image.');
  }

  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new ImageCompressionError('Proof photo is too large. Choose a photo under 12 MB.');
  }

  let image: DecodedImage | null = null;
  try {
    image = await decodeImage(file);
    validateImageDimensions(image.width, image.height);
    const shouldCompress = file.size >= MIN_BYTES_TO_COMPRESS;

    if (file.size <= TARGET_MAX_BYTES && !shouldCompress && Math.max(image.width, image.height) <= MAX_IMAGE_DIMENSIONS[0]) {
      return unchanged(file);
    }

    let bestBlob: Blob | null = null;
    for (const maxDimension of MAX_IMAGE_DIMENSIONS) {
      const dimensions = fitWithinBounds(image.width, image.height, maxDimension);
      for (const quality of JPEG_QUALITIES) {
        const blob = await renderToJpegBlob(image.source, dimensions.width, dimensions.height, quality);
        if (!blob) {
          continue;
        }

        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob;
        }

        if (blob.size <= TARGET_MAX_BYTES) {
          return toResult(file, blob);
        }
      }
    }

    if (file.size <= TARGET_MAX_BYTES) {
      return unchanged(file);
    }

    throw new ImageCompressionError(
      `Photo is still larger than ${formatMegabytes(TARGET_MAX_BYTES)} after optimization. Retake the photo closer to the subject or choose a smaller image.`,
    );
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
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function validateImageDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new ImageCompressionError('Unable to read proof photo dimensions.');
  }

  if (Math.max(width, height) > 9000) {
    throw new ImageCompressionError('Proof photo dimensions are too large. Choose a smaller image.');
  }
}

function renderToJpegBlob(source: CanvasImageSource, width: number, height: number, quality: number): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    return Promise.resolve(null);
  }

  context.drawImage(source, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(resolve, OUTPUT_MIME_TYPE, quality);
  });
}

function toResult(originalFile: File, blob: Blob): ImageCompressionResult {
  const compressedFile = new File([blob], toJpegFilename(originalFile.name), {
    type: OUTPUT_MIME_TYPE,
    lastModified: Date.now(),
  });

  return {
    file: compressedFile,
    originalSize: originalFile.size,
    compressedSize: compressedFile.size,
    compressed: compressedFile.size < originalFile.size,
  };
}

function toJpegFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) {
    return 'proof-photo.jpg';
  }

  return trimmed.replace(/\.[^.]+$/, '') + '.jpg';
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
