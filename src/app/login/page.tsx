import { LoginExperience, RecoveryExperience } from "@/components/consumer/AccountExperience";
export const metadata = { title: "Sign in" };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[]; mode?: string }> }) {
  const { next, mode } = await searchParams;
  const returnTo = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.includes(String.fromCharCode(92)) && !/[\u0000-\u0020\u007f]/.test(next) ? next : "/dashboard";
  if(mode==="forgot"||mode==="reset")return <RecoveryExperience reset={mode==="reset"}/>;
  return <LoginExperience returnTo={returnTo} initialMode={mode==="signup"?"signup":"login"} />;
}

