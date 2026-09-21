import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/app-name";

const icon = process.env.NEXT_PUBLIC_PWA_ICON?.trim() || "/favicon.ico";
const iconExtension = icon.split(/[?#]/, 1)[0].split(".").pop()?.toLowerCase();
const iconType = {
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  ico: "image/x-icon",
}[iconExtension ?? ""];

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Explore films, series, trailers, recommendations, and live channels.",
    start_url: "/",
    display: "standalone",
    background_color: "#010101",
    theme_color: "#010101",
    icons: [
      {
        src: icon,
        sizes: "any",
        ...(iconType ? { type: iconType } : {}),
      },
    ],
  };
}
