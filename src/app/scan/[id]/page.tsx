import { ScanDetail } from "@/components/consumer/ScanExperience";
export const metadata = { title: "Verification details" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ScanDetail id={id} />; }
