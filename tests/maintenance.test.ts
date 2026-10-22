import test from "node:test";
import assert from "node:assert/strict";
import { bearerMatches, personalPhotoPaths, retentionCutoff } from "../src/lib/maintenance-policy";

const secret = "s".repeat(40);
test("maintenance requires the exact bearer secret",()=>{assert.equal(bearerMatches(`Bearer ${secret}`,secret),true);assert.equal(bearerMatches(`Bearer ${secret}x`,secret),false);assert.equal(bearerMatches(secret,secret),false);assert.equal(bearerMatches(null,secret),false);});
test("a missing or weak cron secret never authorizes",()=>{assert.equal(bearerMatches("Bearer ",undefined),false);assert.equal(bearerMatches("Bearer short","short"),false);assert.equal(bearerMatches("Bearer ",""),false);});
test("retention cutoff subtracts whole days",()=>{assert.equal(retentionCutoff(new Date("2026-10-22T00:00:00Z"),90).toISOString(),"2026-07-24T00:00:00.000Z");});
test("retention never removes brand reference images",()=>{assert.deepEqual(personalPhotoPaths(["analysis/a.jpg","reference/b.png","scans/c.webp"]),["analysis/a.jpg","scans/c.webp"]);});
