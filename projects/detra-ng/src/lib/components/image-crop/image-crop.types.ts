export type ImageCropShape = 'circle' | 'round-rect' | 'rect';
export type ImageCropOutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export interface CropResult {
  croppedImageBlob: Blob;
  croppedImageUrl: string;
  file: File;
  base64: string;
  width: number;
  height: number;
}
