export type CropRatioId = "original" | "1:1" | "4:5" | "16:9";

export type CropRatioOption = {
  id: CropRatioId;
  label: string;
  /** null = keep source aspect */
  value: number | null;
};

export const CROP_RATIO_OPTIONS: CropRatioOption[] = [
  { id: "original", label: "Original", value: null },
  { id: "1:1", label: "1:1", value: 1 },
  { id: "4:5", label: "4:5", value: 4 / 5 },
  { id: "16:9", label: "16:9", value: 16 / 9 }
];

/** Normalized crop in source-image pixel space. */
export type ImageCropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};
