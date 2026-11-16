import { ImageResponse } from "next/og";
import { AppIcon } from "@/lib/app-icon";

// Favicon, and the sizes a web app manifest needs for home-screen install
const sizes = [32, 192, 512];

export function generateImageMetadata() {
  return sizes.map((size) => ({ id: String(size), size: { width: size, height: size }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string> }): Promise<ImageResponse> {
  const size = Number(await id);
  return new ImageResponse(<AppIcon size={size} />, { width: size, height: size });
}
