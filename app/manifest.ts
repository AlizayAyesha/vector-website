import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vector OS",
    short_name: "Vector OS",
    description: "An AI workspace for CAD and engineering. Plan, build and review in your tools.",
    start_url: "/",
    display: "standalone",
    background_color: "#080A0D",
    theme_color: "#080A0D",
    icons: [
      { src: "/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
