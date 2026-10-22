import test from "node:test";
import assert from "node:assert/strict";
import { verify, distanceKm, rewardCodeKey, isValidRewardScan, activeRegistryProduct } from "../src/lib/verification";
import { scanInput, analysisOutput } from "../src/lib/validation";
import { parseCsv } from "../src/lib/csv";

test("a registry match alone cannot claim physical authenticity",()=>{const result=verify({productFound:true,serialProvided:false});assert.equal(result.verdict,"UNKNOWN");assert.equal(result.reasons[0].code,"BARCODE_ONLY");});
test("an unknown barcode remains unknown despite many repeated scans",()=>{const result=verify({productFound:false,serialProvided:false,recentCount:100,distantDuplicate:true});assert.equal(result.verdict,"UNKNOWN");});
test("a unique issued active serial supports genuine with a qualified explanation",()=>{const result=verify({productFound:true,serialProvided:true,issuedCode:{status:"ACTIVE",batch:null}});assert.equal(result.verdict,"GENUINE");assert.match(result.reasons[0].message,/cannot prove/);});
test("a missing serial is suspicious rather than conclusive counterfeit evidence",()=>{assert.equal(verify({productFound:true,serialProvided:true,issuedCode:null}).verdict,"SUSPICIOUS");});
test("brand-revoked counterfeit codes remain counterfeit despite a high AI score",()=>{assert.equal(verify({productFound:true,serialProvided:true,issuedCode:{status:"REVOKED",batch:null},ai:{authenticityScore:100,confidence:1}}).verdict,"COUNTERFEIT");});
test("a conflicting batch prevents a genuine claim",()=>{const result=verify({productFound:true,serialProvided:true,issuedCode:{status:"ACTIVE",batch:"issued-batch"},suppliedBatch:"different-batch"});assert.equal(result.verdict,"SUSPICIOUS");assert.equal(result.reasons[0].code,"BATCH_MISMATCH");});
test("distant scans raise suspicion, never definitive counterfeit claims",()=>{assert.equal(verify({productFound:true,serialProvided:true,issuedCode:{status:"ACTIVE",batch:null},distantDuplicate:true}).verdict,"SUSPICIOUS");});
test("AI alone cannot create a counterfeit verdict",()=>{for(const productFound of [true,false]){const result=verify({productFound,serialProvided:false,ai:{authenticityScore:0,confidence:1}});assert.notEqual(result.verdict,"COUNTERFEIT");}});
test("low-confidence AI cannot override a matching issued code",()=>{const result=verify({productFound:true,serialProvided:true,issuedCode:{status:"ACTIVE",batch:null},ai:{authenticityScore:0,confidence:.2}});assert.equal(result.verdict,"GENUINE");assert.ok(result.reasons.some(r=>r.code==="AI_NEEDS_REVIEW"));});
test("location cannot be submitted without explicit consent",()=>{assert.equal(scanInput.safeParse({gtin:"0000123456789",locationConsent:false,location:{lat:0,lng:0}}).success,false);assert.equal(scanInput.safeParse({gtin:"0000123456789",locationConsent:false}).success,true);});
test("out-of-range location and malformed AI scores fail validation",()=>{assert.equal(scanInput.safeParse({gtin:"0000123456789",locationConsent:true,location:{lat:91,lng:0}}).success,false);assert.equal(analysisOutput.safeParse({authenticityScore:101,confidence:1,findings:[]}).success,false);assert.equal(analysisOutput.safeParse({authenticityScore:20,confidence:70,findings:[]}).success,false);});
test("reward identity keeps GTIN leading zeros and scopes serial to the product",()=>{assert.notEqual(rewardCodeKey("00001234","serial"),rewardCodeKey("1234","serial"));assert.notEqual(rewardCodeKey("00001234","serial"),rewardCodeKey("00001235","serial"));assert.equal(rewardCodeKey("00001234"),rewardCodeKey("00001234",""));});
test("distance calculation handles the equator and antimeridian",()=>{assert.equal(distanceKm({lat:0,lng:0},{lat:0,lng:0}),0);assert.ok(distanceKm({lat:0,lng:179.99},{lat:0,lng:-179.99})<3);});
test("CSV preserves quoted fields, embedded newlines and leading zero GTINs",()=>{const rows=parseCsv('gtin,name,brand\n00001234,"Pack, large","Brand"\n00005678,"Line\nbreak","Quoted ""brand"""');assert.equal(rows[0].gtin,"00001234");assert.equal(rows[0].name,"Pack, large");assert.equal(rows[1].name,"Line\nbreak");assert.equal(rows[1].brand,'Quoted "brand"');});
test("malformed or ambiguous CSV imports are rejected before mutation",()=>{assert.throws(()=>parseCsv('gtin,name,name,brand\n1,a,b,c'));assert.throws(()=>parseCsv('gtin,name,brand\n1,"unfinished,b'));assert.throws(()=>parseCsv('gtin,name,brand\n1,a'));});

test("revoked, inactive, absent and mismatched codes cannot earn valid-scan points",()=>{
  assert.equal(isValidRewardScan(true,{status:"ACTIVE",batch:"issued"},"issued"),true);
  for(const status of ["REVOKED","INACTIVE"])assert.equal(isValidRewardScan(true,{status,batch:null}),false);
  assert.equal(isValidRewardScan(true,null),false);
  assert.equal(isValidRewardScan(false,{status:"ACTIVE",batch:null}),false);
  assert.equal(isValidRewardScan(true,{status:"ACTIVE",batch:"issued"},"different"),false);
});

test("reward code identity cannot collide through separators or the former barcode sentinel",()=>{
  assert.notEqual(rewardCodeKey("abcd:ef","gh"),rewardCodeKey("abcd","ef:gh"));
  assert.notEqual(rewardCodeKey("abcd"),rewardCodeKey("abcd","barcode"));
});
test("archived registry data cannot restore a genuine verdict after packaging analysis",()=>{
  const archived=activeRegistryProduct({status:"ARCHIVED"});
  assert.equal(archived,null);
  const result=verify({productFound:!!archived,serialProvided:true,issuedCode:{status:"ACTIVE",batch:null},ai:{authenticityScore:100,confidence:1}});
  assert.equal(result.verdict,"UNKNOWN");
  assert.ok(activeRegistryProduct({status:"ACTIVE"}));
});
