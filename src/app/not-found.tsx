import Link from "next/link";
import { ArrowLeft, ScanLine } from "lucide-react";
export default function NotFound(){return <section className="panel empty-state"><ScanLine size={40}/><p className="eyebrow">404 / A SMALL DETOUR</p><h1 className="page-heading">This shelf is empty.</h1><p className="muted">The page you’re looking for isn’t here. Let’s get you back.</p><Link href="/" className="button primary"><ArrowLeft size={17}/>Back to your workspace</Link></section>;}
