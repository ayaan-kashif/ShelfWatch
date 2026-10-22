import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, parseCsv, toCsv } from "../src/lib/csv";

test("CSV export neutralises spreadsheet formulas",()=>{for(const evil of ["=HYPERLINK(\"x\")","+1","-2+3","@SUM(A1)","\tcmd"])assert.ok(csvCell(evil).startsWith(`"'`));assert.equal(csvCell("normal"),'"normal"');});
test("CSV export quotes delimiters and keeps leading-zero barcodes",()=>{const body=toCsv(["gtin","name","brand"],[["00001234",'Pack, "large"',"Line\nbreak"]]);const rows=parseCsv(body);assert.equal(rows[0].gtin,"00001234");assert.equal(rows[0].name,'Pack, "large"');assert.equal(rows[0].brand,"Line\nbreak");});
test("CSV export renders empty values, dates and lists predictably",()=>{assert.equal(csvCell(null),'""');assert.equal(csvCell(new Date("2026-01-02T03:04:05Z")),'"2026-01-02T03:04:05.000Z"');assert.equal(csvCell(["A","B"]),'"A|B"');});
