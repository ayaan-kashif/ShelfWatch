import test from "node:test";
import assert from "node:assert/strict";
import { analysisBudget } from "../src/lib/analysis-policy";
test("the packaging request ceiling defaults safely and can be disabled",()=>{
  assert.equal(analysisBudget(undefined).limit,50);
  assert.equal(analysisBudget("0").limit,0);
  assert.equal(analysisBudget("17").limit,17);
  for(const invalid of ["-1","2.5","bad","10001"])assert.throws(()=>analysisBudget(invalid));
});
test("the shared packaging ceiling is scoped to a UTC date and expires at its boundary",()=>{
  const before=analysisBudget("50",new Date("2026-10-05T23:59:59.500Z"));
  const after=analysisBudget("50",new Date("2026-10-06T00:00:00.000Z"));
  assert.equal(before.key,"analysis-budget:2026-10-05");assert.equal(before.seconds,1);
  assert.equal(after.key,"analysis-budget:2026-10-06");assert.equal(after.seconds,86400);
});
