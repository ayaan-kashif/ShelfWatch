import test from "node:test";
import assert from "node:assert/strict";
import { productPatchInput, settingsPatchInput, rewardPatchInput, settingsInput } from "../src/lib/validation";

test("a name-only product patch preserves references, attributes and archive state",()=>{
  const patch=productPatchInput.parse({name:"Updated label"});
  assert.deepEqual(patch,{name:"Updated label"});
  const current={name:"Old label",referenceImages:["reference/owned.jpg"],attributes:{seal:"gold"},status:"ARCHIVED"};
  assert.deepEqual({...current,...patch},{...current,name:"Updated label"});
});
test("changing one setting does not reset saved policies to defaults",()=>{
  const current=settingsInput.parse({alertCount:8,alertRadiusKm:3,alertWindowHours:48,dailyScanCap:4,scanPoints:7,analysisPoints:2,confirmedReportPoints:30,retentionDays:14});
  const patch=settingsPatchInput.parse({alertCount:9});
  assert.deepEqual(patch,{alertCount:9});
  assert.deepEqual(settingsInput.parse({...current,...patch}),{...current,alertCount:9});
});
test("reward price-only updates preserve stock and deactivated state",()=>{
  const patch=rewardPatchInput.parse({pointsCost:25});
  assert.deepEqual(patch,{pointsCost:25});
  assert.deepEqual({...{pointsCost:10,stock:3,active:false},...patch},{pointsCost:25,stock:3,active:false});
});
test("empty patches emit no defaults and explicit resets remain intentional",()=>{
  assert.deepEqual(productPatchInput.parse({}),{});
  assert.deepEqual(settingsPatchInput.parse({}),{});
  assert.deepEqual(rewardPatchInput.parse({}),{});
  assert.deepEqual(rewardPatchInput.parse({stock:null,active:false}),{stock:null,active:false});
  assert.deepEqual(productPatchInput.parse({referenceImages:[],attributes:{},status:"ACTIVE"}),{referenceImages:[],attributes:{},status:"ACTIVE"});
});
test("partial updates retain input validation bounds",()=>{
  assert.equal(settingsPatchInput.safeParse({dailyScanCap:-1}).success,false);
  assert.equal(rewardPatchInput.safeParse({pointsCost:0}).success,false);
  assert.equal(productPatchInput.safeParse({referenceImages:["https://untrusted.example/image"]}).success,false);
});
