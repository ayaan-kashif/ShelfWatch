import ScanDetail from "@/components/admin/ScanDetail";
export default async function Page({ params }: { params: Promise<{id: string}> }) { const {id} = await params; return <ScanDetail id={id} />; }
