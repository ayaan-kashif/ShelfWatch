import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShelfWatch", short_name: "ShelfWatch", description: "Scan everyday products, review authenticity signals, and help make your community safer.",
    id: "/", start_url: "/dashboard", scope: "/", display: "standalone", background_color: "#f8f9fc", theme_color: "#2858e5",
    icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }, { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
    shortcuts: [{ name: "Scan a product", url: "/scan", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  };
}
