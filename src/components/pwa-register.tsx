"use client";
import { useEffect } from "react";
// Registers the shell-only service worker in production on secure origins.
export function PwaRegister() {
  useEffect(() => { if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator && window.isSecureContext) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {}); }, []);
  return null;
}
