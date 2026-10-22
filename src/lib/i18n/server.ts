import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale, translate, type T } from "./translate";
export async function getLocale() { return parseLocale((await cookies()).get(LOCALE_COOKIE)?.value); }
export async function getT(): Promise<T> { const locale = await getLocale(); return (text, vars) => translate(locale, text, vars); }
