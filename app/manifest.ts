import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "レシート家計簿",
    short_name: "家計簿",
    description:
      "レシートを撮るだけ。お菓子とコンビニの支出を、やさしく見える化。",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f59e0b",
    lang: "ja",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
