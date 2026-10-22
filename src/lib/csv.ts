export function parseCsv(text: string): Record<string,string>[] {
  const rows:string[][]=[];let row:string[]=[];let cell="";let quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell="";}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell="";}else cell+=c;}
  if(quoted)throw new Error("CSV contains an unclosed quoted field.");row.push(cell);if(row.some(Boolean))rows.push(row);
  const headers=rows.shift()?.map(h=>h.trim().replace(/^\uFEFF/,""));if(!headers?.includes("gtin")||!headers.includes("name")||!headers.includes("brand"))throw new Error("CSV requires gtin, name and brand columns.");
  if(new Set(headers).size!==headers.length)throw new Error("CSV contains duplicate column names.");
  return rows.map(values=>{if(values.length!==headers.length)throw new Error("A CSV row has the wrong number of columns.");return Object.fromEntries(headers.map((header,i)=>[header,values[i].trim()]));});
}
// Spreadsheet-safe export: quotes every cell and neutralises formula prefixes (CSV injection).
export function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.join("|") : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function toCsv(headers: string[], rows: unknown[][]) { return "﻿" + [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n"; }
