"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useT } from "./i18n";
function subscribe(callback:()=>void){window.addEventListener("shelfwatch-theme",callback);window.addEventListener("storage",callback);return()=>{window.removeEventListener("shelfwatch-theme",callback);window.removeEventListener("storage",callback);};}
export function ThemeToggle(){const t=useT();const theme=useSyncExternalStore(subscribe,()=>document.documentElement.dataset.theme||"light",()=>"light");function toggle(){const next=theme==="dark"?"light":"dark";document.documentElement.dataset.theme=next;try{localStorage.setItem("shelfwatch-theme",next);}catch{}window.dispatchEvent(new Event("shelfwatch-theme"));}return <button className="theme-toggle" onClick={toggle} aria-label={t(theme==="dark"?"Switch to light mode":"Switch to dark mode")} title={t(theme==="dark"?"Switch to light mode":"Switch to dark mode")}>{theme==="dark"?<Sun size={19}/>:<Moon size={19}/>}</button>;}
