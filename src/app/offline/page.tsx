import Link from "next/link";
import { WifiOff } from "lucide-react";
export const metadata = { title: "Offline" };
export default function Offline() {
  return <section className="panel empty-state" style={{ maxWidth: 560, margin: "48px auto", padding: 40, textAlign: "center", display: "grid", gap: 16, justifyItems: "center" }}><WifiOff size={36} aria-hidden="true" /><h1 className="page-heading">You’re offline</h1><p className="muted">ShelfWatch needs a connection to check a product, because every verdict comes from live registry evidence. Nothing is shown from an old copy.</p><p className="muted">Reconnect, then try again.</p><Link className="button primary" href="/scan">Try again</Link></section>;
}
