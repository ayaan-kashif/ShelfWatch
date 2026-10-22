import Link from "next/link";
import { Database, LockKeyhole } from "lucide-react";
import { getPageActor, requireAdmin } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { AdminProvider } from "@/components/admin/shared";
import "@/components/admin/admin.css";

export const dynamic = "force-dynamic";
function AccessState({ setup, signedIn, message }: { setup: boolean; signedIn?: boolean; message: string }) {
  return <section className="panel ad-access">{setup ? <Database size={40} aria-hidden="true" /> : <LockKeyhole size={40} aria-hidden="true" />}<p className="eyebrow">SHELFWATCH WORKSPACE</p><h1>{setup ? "Your workspace is being connected" : signedIn ? "Administrator access required" : "Sign in to your workspace"}</h1><p>{message}</p><div className="ad-actions">{!setup && !signedIn && <Link className="button primary" href="/login?next=/admin">Sign in</Link>}<Link className="button secondary" href="/">Back to ShelfWatch</Link></div></section>;
}
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.DATABASE_URL) return <AccessState setup message="The team workspace will become available once its secure database connection is complete. Consumer product scanning remains accessible from the main app." />;
  let role: string;
  try { const who = await getPageActor(); role = requireAdmin(who).role; }
  catch (cause) { const status = cause instanceof ApiError ? cause.status : 503; return <AccessState setup={status >= 500} signedIn={status === 403} message={status === 401 ? "Use your administrator account to review scans, investigate alerts, and manage the product registry." : status === 403 ? "This area is available to approved administrators. Contact the project owner if your account needs access." : "We could not securely load the team workspace. Please try again after the connection is restored."} />; }
  return <AdminProvider role={role}>{children}</AdminProvider>;
}
