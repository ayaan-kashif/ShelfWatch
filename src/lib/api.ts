import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { ApiError, errorResponse } from "./errors";
import { actor, authConfigured, hash, ownerWhere, publicUser, requireAdmin, requireUser, supabase, type Actor } from "./auth";
import { audit, balance, ownedScan, rateLimit, safeScan, scanInclude, settings } from "./data";
import { createScan } from "./scanning";
import { analyze } from "./analysis";
import { signedImages, uploadImage, validateImages } from "./storage";
import { productInput, productPatchInput, rewardInput, rewardPatchInput, settingsInput, settingsPatchInput, uuid } from "./validation";
import { tierFor, type Reason } from "./verification";
import { awardBonus, redeem, resolveRedemption } from "./rewards";
import { updateAlerts } from "./alerts";
import { parseCsv, toCsv } from "./csv";
import { runMaintenance } from "./maintenance";
import { deliverAlert, notificationChannels, queueAlertNotification } from "./notify";
import type { AlertEvent } from "./alert-notify-format";
import { verifyHuman } from "./turnstile";
import { phoneNumber, smsCode } from "./phone";
import { bearerMatches } from "./maintenance-policy";
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control":"private, no-store" } });
async function body(request: Request) { const raw=await request.text(); if(raw.length>500000)throw new ApiError(413,"Request is too large.","TOO_LARGE");try{return JSON.parse(raw);}catch{throw new ApiError(400,"Request must contain valid JSON.","INVALID_JSON");} }
function mutationOrigin(request: Request) { if(["GET","HEAD","OPTIONS"].includes(request.method))return;const origin=request.headers.get("origin");const allowed=new URL(request.url).origin;if((origin&&origin!==allowed&&origin!==process.env.NEXT_PUBLIC_SITE_URL)||request.headers.get("sec-fetch-site")==="cross-site")throw new ApiError(403,"This request must come from ShelfWatch.","INVALID_ORIGIN"); }
function filters(url: URL): Prisma.ScanWhereInput {
  const where:Prisma.ScanWhereInput={};const verdict=url.searchParams.get("verdict");if(verdict&&verdict!=="ALL")where.verdict=z.enum(["GENUINE","SUSPICIOUS","COUNTERFEIT","UNKNOWN"]).parse(verdict);
  const productId=url.searchParams.get("productId");if(productId)where.productId=uuid.parse(productId);
  const city=url.searchParams.get("city");if(city)where.city={contains:city.slice(0,100),mode:"insensitive"};
  const search=url.searchParams.get("search");if(search)where.OR=[{gtin:{contains:search.slice(0,128),mode:"insensitive"}},{product:{name:{contains:search.slice(0,128),mode:"insensitive"}}}];
  const from=url.searchParams.get("from"),to=url.searchParams.get("to");if(from||to){const start=from?new Date(from):undefined,end=to?new Date(to):undefined;if((start&&!Number.isFinite(start.getTime()))||(end&&!Number.isFinite(end.getTime())))throw new ApiError(400,"Enter a valid date range.","INVALID_INPUT");where.createdAt={gte:start,lte:end};}return where;
}
function paging(url:URL){const page=z.coerce.number().int().min(1).max(10000).parse(url.searchParams.get("page")||1);const pageSize=z.coerce.number().int().min(1).max(100).parse(url.searchParams.get("pageSize")||30);return{page,pageSize,skip:(page-1)*pageSize};}
async function decorateScan(scan:Awaited<ReturnType<typeof ownedScan>>){const analyses=await Promise.all(scan.analyses.map(async item=>({...item,imageUrls:await signedImages(item.imagePaths)})));return{...safeScan(scan),analyses,analysis:analyses[0]??null};}
const EXPORT_LIMIT=50000;
async function exportCsv(kind:"scans"|"alerts"|"reports"|"redemptions",url:URL){
  if(kind==="scans"){const rows=await db().scan.findMany({where:filters(url),include:{product:{select:{name:true,brand:true}}},orderBy:{createdAt:"desc"},take:EXPORT_LIMIT});return{rows:rows.length,body:toCsv(["scanId","createdAt","gtin","serial","batch","product","brand","verdict","riskScore","reasons","locationShared","lat","lng","city","signedIn"],rows.map(s=>[s.id,s.createdAt,s.gtin,s.serial,s.batch,s.product?.name,s.product?.brand,s.verdict,s.riskScore,(s.reasons as Reason[]).map(r=>r.code),s.locationConsent,s.locationConsent?s.lat:null,s.locationConsent?s.lng:null,s.city,Boolean(s.userId)]))};}
  if(kind==="alerts"){const rows=await db().alert.findMany({include:{_count:{select:{scans:true}}},orderBy:{createdAt:"desc"},take:EXPORT_LIMIT});return{rows:rows.length,body:toCsv(["alertId","createdAt","updatedAt","status","severity","scans","centerLat","centerLng","radiusKm","assigneeId","notes"],rows.map(a=>[a.id,a.createdAt,a.updatedAt,a.status,a.severity,a._count.scans,a.centerLat,a.centerLng,a.radiusKm,a.assigneeId,a.notes]))};}
  if(kind==="reports"){const rows=await db().report.findMany({include:{scan:{select:{gtin:true,verdict:true,product:{select:{name:true}}}}},orderBy:{createdAt:"desc"},take:EXPORT_LIMIT});return{rows:rows.length,body:toCsv(["reportId","createdAt","status","scanId","gtin","product","currentVerdict","reason"],rows.map(r=>[r.id,r.createdAt,r.status,r.scanId,r.scan.gtin,r.scan.product?.name,r.scan.verdict,r.reason]))};}
  const rows=await db().redemption.findMany({include:{reward:{select:{name:true}}},orderBy:{createdAt:"desc"},take:EXPORT_LIMIT});return{rows:rows.length,body:toCsv(["redemptionId","createdAt","status","reward","pointsCost","userId"],rows.map(r=>[r.id,r.createdAt,r.status,r.reward.name,r.pointsCost,r.userId]))};
}
async function authRoute(request:Request,path:string[]){
  const action=path[1];
  if(action==="me"&&request.method==="GET"){if(!authConfigured())return json({user:null,configured:false});return json({user:publicUser((await actor()).user),configured:true});}
  const client=await supabase();
  if(action==="callback"&&request.method==="GET"){const code=new URL(request.url).searchParams.get("code");if(!code)throw new ApiError(400,"The confirmation link is incomplete.","AUTH_ERROR");const{error}=await client.auth.exchangeCodeForSession(code);if(error)throw new ApiError(400,"This confirmation link has expired. Please sign in again.","AUTH_ERROR");return Response.redirect(new URL(new URL(request.url).searchParams.get("next")==="/login?mode=reset"?"/login?mode=reset":"/dashboard",request.url));}
  if(request.method!=="POST")throw new ApiError(405,"Method not allowed.","METHOD_NOT_ALLOWED");
  if(action==="logout"){await client.auth.signOut();return json({success:true});}
  if(action==="phone-send"){
    const input=z.object({phone:phoneNumber,turnstileToken:z.string().max(2048).optional()}).parse(await body(request));
    await verifyHuman(request,input.turnstileToken);
    await rateLimit(`phone-send:${hash(input.phone)}`,3,3600);
    const{error}=await client.auth.signInWithOtp({phone:input.phone});
    if(error){if(/provider|not enabled|unsupported/i.test(error.message))throw new ApiError(503,"Phone sign-in is not enabled yet. Please use email for now.","SETUP_REQUIRED");throw new ApiError(400,"We couldn’t send a code to this number. Check it and try again.","AUTH_ERROR");}
    return json({message:"We sent a 6-digit code by text message. It expires shortly."});
  }
  if(action==="phone-verify"){
    const input=z.object({phone:phoneNumber,code:smsCode}).parse(await body(request));
    await rateLimit(`phone-verify:${hash(input.phone)}`,10,3600);
    const{error}=await client.auth.verifyOtp({phone:input.phone,token:input.code,type:"sms"});
    if(error)throw new ApiError(401,"That code is incorrect or has expired. Request a new one.","AUTH_ERROR");
    return json({user:publicUser((await actor()).user)});
  }
  if(action==="reset-password"){
    const input=z.object({email:z.string().trim().email().max(254),turnstileToken:z.string().max(2048).optional()}).parse(await body(request));
    await verifyHuman(request,input.turnstileToken);
    await rateLimit(`password-reset:${hash(input.email.toLowerCase())}`,5,3600);
    const redirect=new URL("/api/auth/callback",process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin);redirect.searchParams.set("next","/login?mode=reset");
    const{error}=await client.auth.resetPasswordForEmail(input.email,{redirectTo:redirect.toString()});
    if(error)throw new ApiError(400,"We couldn’t send a recovery link. Please wait and try again.","AUTH_ERROR");
    return json({message:"If an account exists for this email, you’ll receive a password reset link. Check your inbox and spam folder."});
  }
  if(action==="update-password"){
    const who=await actor();requireUser(who);
    const input=z.object({password:z.string().min(8).max(128)}).parse(await body(request));
    await rateLimit(`password-update:${who.key}`,5,3600);
    const{error}=await client.auth.updateUser({password:input.password});
    if(error)throw new ApiError(400,"Your password couldn’t be updated. Request a fresh recovery link and try again.","AUTH_ERROR");
    return json({message:"Your password has been updated."});
  }
  const input=z.object({email:z.string().email().max(254),password:z.string().min(8).max(128),name:z.string().trim().max(100).optional(),turnstileToken:z.string().max(2048).optional()}).parse(await body(request));
  if(action==="login"||action==="signup")await verifyHuman(request,input.turnstileToken);
  if(action==="login"){const{error}=await client.auth.signInWithPassword({email:input.email,password:input.password});if(error)throw new ApiError(401,"Could not sign in. Check your email, password and email confirmation.","AUTH_ERROR");return json({user:publicUser((await actor()).user)});}
  if(action==="signup"){const site=process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin;const{data,error}=await client.auth.signUp({email:input.email,password:input.password,options:{data:{name:input.name},emailRedirectTo:`${site}/api/auth/callback`}});if(error)throw new ApiError(400,"Could not create your account. Please try again.","AUTH_ERROR");return json({user:data.session?publicUser((await actor()).user):null,confirmationRequired:!data.session,message:data.session?"Your account is ready.":"Check your email to confirm your account."},201);}
  throw new ApiError(404,"Endpoint not found.","NOT_FOUND");
}
async function adminRoute(request:Request,path:string[],who:Actor,url:URL){
  requireAdmin(who);const resource=path[1],id=path[2];const method=request.method;
  if(resource==="overview"&&method==="GET"){const day=new Date();day.setUTCHours(0,0,0,0);const[totalScans,flaggedScans,openAlerts,products,scansToday,recentScans]=await Promise.all([db().scan.count(),db().scan.count({where:{verdict:{in:["SUSPICIOUS","COUNTERFEIT"]}}}),db().alert.count({where:{status:{not:"RESOLVED"}}}),db().product.count({where:{status:"ACTIVE"}}),db().scan.count({where:{createdAt:{gte:day}}}),db().scan.findMany({orderBy:{createdAt:"desc"},take:10,include:scanInclude})]);return json({totalScans,flaggedScans,openAlerts,products,scansToday,recentScans:recentScans.map(safeScan)});}
  if(resource==="analytics"&&method==="GET"){const rows=await db().scan.findMany({where:{createdAt:{gte:new Date(Date.now()-30*86400000)}},select:{createdAt:true,verdict:true,productId:true,city:true,product:{select:{name:true,brand:true}}},take:50000});const daily=new Map<string,{date:string;scans:number;flagged:number}>(),products=new Map<string,{productId:string;name:string;scans:number;flagged:number}>(),regions=new Map<string,{city:string;scans:number;flagged:number}>();for(const row of rows){const date=row.createdAt.toISOString().slice(0,10),flagged=["COUNTERFEIT","SUSPICIOUS"].includes(row.verdict)?1:0;const day=daily.get(date)??{date,scans:0,flagged:0};day.scans++;day.flagged+=flagged;daily.set(date,day);if(row.productId){const p=products.get(row.productId)??{productId:row.productId,name:row.product?.name??"Archived product",scans:0,flagged:0};p.scans++;p.flagged+=flagged;products.set(row.productId,p);}if(row.city){const r=regions.get(row.city)??{city:row.city,scans:0,flagged:0};r.scans++;r.flagged+=flagged;regions.set(row.city,r);}}return json({daily:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)),products:[...products.values()].sort((a,b)=>b.flagged-a.flagged),regions:[...regions.values()].sort((a,b)=>b.flagged-a.flagged),truncated:rows.length===50000});}
  if(resource==="products"&&method==="GET"){if(id)return json({product:await db().product.findUniqueOrThrow({where:{id:uuid.parse(id)},include:{codes:true}})});return json({products:await db().product.findMany({orderBy:{createdAt:"desc"},take:1000})});}
  if(resource==="codes"&&method==="GET")return json({codes:await db().issuedCode.findMany({where:url.searchParams.get("productId")?{productId:uuid.parse(url.searchParams.get("productId"))}:{},include:{product:true},orderBy:{createdAt:"desc"},take:500})});
  if(resource==="settings"&&method==="GET")return json({settings:await settings()});
  if(resource==="notifications"&&method==="GET"&&!id)return json({channels:notificationChannels()});
  if(resource==="rewards"&&method==="GET")return json({items:await db().rewardItem.findMany({orderBy:{createdAt:"desc"}})});
  if(resource==="redemptions"&&method==="GET"&&!id){const status=url.searchParams.get("status");return json({redemptions:await db().redemption.findMany({where:status&&status!=="ALL"?{status:z.enum(["PENDING","FULFILLED","CANCELLED"]).parse(status)}:{},include:{reward:{select:{name:true}},user:{select:{id:true,name:true}}},orderBy:{createdAt:"asc"},take:200})});}
  if(resource==="reports"&&method==="GET")return json({reports:await db().report.findMany({include:{scan:{include:{product:true}}},orderBy:{createdAt:"desc"},take:100})});
  if(resource==="reports"&&id&&method==="PATCH"){
    const input=z.object({status:z.enum(["CONFIRMED","DISMISSED"]),notes:z.string().trim().min(10).max(2000)}).parse(await body(request));
    const report=await db().report.findUnique({where:{id:uuid.parse(id)}});if(!report)throw new ApiError(404,"Report not found.","NOT_FOUND");
    let alertEvent:AlertEvent|null=null;const updated=await db().$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "Scan" WHERE id=${report.scanId}::uuid FOR UPDATE`;const current=await tx.report.findUniqueOrThrow({where:{id:report.id}});if(current.status!=="PENDING")throw new ApiError(409,"This report has already been reviewed.","CONFLICT");const saved=await tx.report.update({where:{id:report.id},data:{status:input.status}});if(input.status==="CONFIRMED"){const scan=await tx.scan.findUniqueOrThrow({where:{id:report.scanId}});const reasons=[...(scan.reasons as Reason[]),{code:"ADMIN_CONFIRMED",message:`A brand administrator reviewed this report and confirmed counterfeit evidence: ${input.notes}`}];const updatedScan=await tx.scan.update({where:{id:scan.id},data:{verdict:"COUNTERFEIT",riskScore:100,reasons}});const rules=await settings(tx);await awardBonus(tx,scan.userId,scan.id,"CONFIRMED_REPORT",rules.confirmedReportPoints);alertEvent=await updateAlerts(tx,updatedScan,rules);}await audit(who,"REPORT_REVIEWED",report.id,{status:input.status,notes:input.notes},tx);return saved;},{timeout:15000});queueAlertNotification(alertEvent);return json({report:updated});
  }
  if(resource==="export"&&method==="GET"){const kind=z.enum(["scans","alerts","reports","redemptions"]).parse(id);await rateLimit(`export:${who.key}`,20,3600);const csv=await exportCsv(kind,url);await audit(who,"DATA_EXPORTED",undefined,{kind,rows:csv.rows});return new Response(csv.body,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="shelfwatch-${kind}-${new Date().toISOString().slice(0,10)}.csv"`,"Cache-Control":"private, no-store"}});}
  requireAdmin(who,true);
  if(resource==="products"&&id==="import"&&method==="POST"){
    let csv:string;if(request.headers.get("content-type")?.includes("multipart/form-data")){const form=await request.formData();const file=form.get("file");if(!(file instanceof File)||file.size>1024*1024)throw new ApiError(400,"Choose a CSV file under 1 MB.","INVALID_CSV");csv=await file.text();}else csv=z.object({csv:z.string().max(1024*1024)}).parse(await body(request)).csv;
    let rows:Record<string,string>[];try{rows=parseCsv(csv);}catch(error){throw new ApiError(400,error instanceof Error?error.message:"Invalid CSV","INVALID_CSV");}if(!rows.length||rows.length>500)throw new ApiError(400,"Import between 1 and 500 products at a time.","INVALID_CSV");const products=rows.map(row=>productInput.parse({...row,referenceImages:row.referenceImages?row.referenceImages.split("|"):[],attributes:{}}));
    await db().$transaction(async tx=>{for(const product of products)await tx.product.upsert({where:{gtin:product.gtin},create:product,update:product});await audit(who,"PRODUCTS_IMPORTED",undefined,{count:products.length},tx);},{timeout:30000});return json({imported:products.length});
  }
  if(resource==="products"&&method==="POST"&&!id){const input=productInput.parse(await body(request));const product=await db().$transaction(async tx=>{const saved=await tx.product.create({data:input});await audit(who,"PRODUCT_CREATED",saved.id,{},tx);return saved;});return json({product},201);}
  if(resource==="products"&&id&&(method==="PATCH"||method==="PUT"||method==="DELETE")){const data=method==="DELETE"?{status:"ARCHIVED"}:productPatchInput.parse(await body(request));const product=await db().$transaction(async tx=>{const saved=await tx.product.update({where:{id:uuid.parse(id)},data});await audit(who,method==="DELETE"?"PRODUCT_ARCHIVED":"PRODUCT_UPDATED",saved.id,{},tx);return saved;});return json({product});}
  if(resource==="reference-images"&&method==="POST"){const images=await validateImages(await request.formData());const paths=[];for(const image of images)paths.push(await uploadImage("reference",image));await audit(who,"REFERENCE_UPLOADED",undefined,{count:paths.length});return json({paths},201);}
  if(resource==="codes"&&method==="POST"){const input=z.object({productId:uuid,serial:z.string().trim().min(1).max(128),batch:z.string().trim().max(128).optional(),status:z.enum(["ACTIVE","INACTIVE","REVOKED"]).default("ACTIVE")}).parse(await body(request));const code=await db().$transaction(async tx=>{const saved=await tx.issuedCode.create({data:input});await audit(who,"CODE_ISSUED",saved.id,{},tx);return saved;});return json({code},201);}
  if(resource==="codes"&&id&&method==="PATCH"){const input=z.object({status:z.enum(["ACTIVE","INACTIVE","REVOKED"]),batch:z.string().trim().max(128).nullable().optional()}).parse(await body(request));const code=await db().$transaction(async tx=>{const saved=await tx.issuedCode.update({where:{id:uuid.parse(id)},data:input});await audit(who,"CODE_UPDATED",saved.id,{status:input.status},tx);return saved;});return json({code});}
  if(resource==="settings"&&["PUT","PATCH","POST"].includes(method)){const input=settingsPatchInput.parse(await body(request));const value=settingsInput.parse({...await settings(),...input});await db().$transaction(async tx=>{await tx.setting.upsert({where:{key:"app"},create:{key:"app",value},update:{value}});await audit(who,"SETTINGS_UPDATED",undefined,value,tx);});return json({settings:value});}
  if(resource==="notifications"&&id==="test"&&method==="POST"){await rateLimit(`notify-test:${who.key}`,5,3600);const outcomes=await deliverAlert({alertId:"00000000-0000-0000-0000-000000000000",kind:"CREATED",severity:"TEST",scans:0,centerLat:0,centerLng:0,radiusKm:0});await audit(who,"NOTIFICATION_TEST",undefined,{outcomes});return json({outcomes});}
  if(resource==="redemptions"&&id&&method==="PATCH"){const input=z.object({status:z.enum(["FULFILLED","CANCELLED"]),note:z.string().trim().min(3).max(1000)}).parse(await body(request));const redemption=await db().$transaction(async tx=>{const saved=await resolveRedemption(tx,uuid.parse(id),input.status);await audit(who,input.status==="FULFILLED"?"REDEMPTION_FULFILLED":"REDEMPTION_CANCELLED",saved.id,{note:input.note,pointsCost:saved.pointsCost},tx);return saved;},{timeout:15000});return json({redemption});}
  if(resource==="rewards"&&method==="POST"&&!id){const item=await db().rewardItem.create({data:rewardInput.parse(await body(request))});await audit(who,"REWARD_CREATED",item.id);return json({item},201);}
  if(resource==="rewards"&&id&&(method==="PATCH"||method==="DELETE")){const item=await db().rewardItem.update({where:{id:uuid.parse(id)},data:method==="DELETE"?{active:false}:rewardPatchInput.parse(await body(request))});await audit(who,"REWARD_UPDATED",item.id);return json({item});}
  throw new ApiError(404,"Endpoint not found.","NOT_FOUND");
}
export async function handleApi(request:Request,path:string[]){try{
  mutationOrigin(request);const method=request.method,url=new URL(request.url),resource=path[0],id=path[1];
  if(resource==="auth")return await authRoute(request,path);
  if(resource==="cron"&&id==="maintenance"&&(method==="GET"||method==="POST")){if(!process.env.CRON_SECRET)throw new ApiError(503,"Scheduled maintenance is not configured. Set CRON_SECRET.","SETUP_REQUIRED");if(!bearerMatches(request.headers.get("authorization"),process.env.CRON_SECRET))throw new ApiError(401,"Unauthorized.","UNAUTHORIZED");db();const report=await runMaintenance();return json(report,report.ok?200:207);}
  db();const who=await actor(resource==="scan"&&method==="POST"&&!id);
  if(resource==="admin")return await adminRoute(request,path,who,url);
  if(resource==="overview"&&method==="GET"){const where=ownerWhere(who);const[totalScans,genuineScans,flaggedScans,recentScans,pointsBalance]=await Promise.all([db().scan.count({where}),db().scan.count({where:{...where,verdict:"GENUINE"}}),db().scan.count({where:{...where,verdict:{in:["SUSPICIOUS","COUNTERFEIT"]}}}),db().scan.findMany({where,orderBy:{createdAt:"desc"},take:5,include:scanInclude}),who.user?balance(who.user.id):Promise.resolve(0)]);return json({totalScans,genuineScans,flaggedScans,recentScans:recentScans.map(safeScan),pointsBalance,user:publicUser(who.user)});}
  if(resource==="scan"&&!id&&method==="POST"){const{alertEvent,...result}=await createScan(await body(request),who,request.headers.get("idempotency-key"));queueAlertNotification(alertEvent);return json({...result,scan:safeScan(result.scan)},201);}
  if(resource==="history"&&method==="GET"){const{page,pageSize,skip}=paging(url);const where={...filters(url),...ownerWhere(who)};const[scans,total]=await Promise.all([db().scan.findMany({where,include:scanInclude,orderBy:{createdAt:"desc"},take:pageSize,skip}),db().scan.count({where})]);return json({scans:scans.map(safeScan),total,page,pageSize});}
  if(resource==="scan"&&id){uuid.parse(id);if(path[2]==="analyze"&&method==="POST"){if(Number(request.headers.get("content-length")||0)>16*1024*1024)throw new ApiError(413,"Photo upload is too large.","TOO_LARGE");const{alertEvent,...result}=await analyze(id,await request.formData(),who);queueAlertNotification(alertEvent);return json({...result,scan:await decorateScan(result.scan)});}if(path[2]==="report"&&method==="POST"){await ownedScan(id,who,false);await rateLimit(`report:${who.key}`,10,3600);const input=z.object({reason:z.string().trim().min(10,"Tell us a little more (at least 10 characters).").max(2000)}).parse(await body(request));const report=await db().report.upsert({where:{scanId_reporterKey:{scanId:id,reporterKey:who.key}},create:{scanId:id,reporterKey:who.key,reason:input.reason},update:{}});return json({report},201);}if(method==="GET"&&!path[2])return json({scan:await decorateScan(await ownedScan(id,who))});}
  if(resource==="rewards"&&!id&&method==="GET"){const[items,transactions,pointsBalance,redemptions]=await Promise.all([db().rewardItem.findMany({where:{active:true},orderBy:{pointsCost:"asc"}}),who.user?db().rewardTransaction.findMany({where:{userId:who.user.id},orderBy:{createdAt:"desc"},take:100}):Promise.resolve([]),who.user?balance(who.user.id):Promise.resolve(0),who.user?db().redemption.findMany({where:{userId:who.user.id},include:{reward:true},orderBy:{createdAt:"desc"},take:50}):Promise.resolve([])]);return json({items,transactions,pointsBalance,tier:tierFor(pointsBalance),redemptions});}
  if(resource==="rewards"&&id==="redeem"&&method==="POST"){const user=requireUser(who),input=z.object({rewardId:uuid,idempotencyKey:uuid.optional()}).parse(await body(request));await rateLimit(`redeem:${who.key}`,10);const requestKey=hash(`${who.key}:${input.idempotencyKey||request.headers.get("idempotency-key")||randomUUID()}`);const redemption=await db().$transaction(tx=>redeem(tx,user.id,input.rewardId,requestKey));return json({redemption,pointsBalance:await balance(user.id)},201);}
  if(resource==="profile"&&method==="PATCH"){const user=requireUser(who);const input=z.object({name:z.string().trim().min(1).max(100)}).parse(await body(request));return json({user:publicUser(await db().user.update({where:{id:user.id},data:input}))});}
  if(resource==="account"&&id==="deletion-request"&&method==="POST"){requireUser(who);await audit(who,"DELETION_REQUESTED");return json({message:"Your deletion request has been recorded. Your sign-in, profile name, photos and scan locations will be removed at the next scheduled data cleanup."},202);}
  if(["scans","heatmap","alerts"].includes(resource))requireAdmin(who);
  if(resource==="scans"&&method==="GET"){const where=filters(url),{page,pageSize,skip}=paging(url);const[scans,total]=await Promise.all([db().scan.findMany({where,include:{...scanInclude,user:{select:{id:true,name:true}}},orderBy:{createdAt:"desc"},take:pageSize,skip}),db().scan.count({where})]);return json({scans:scans.map(safeScan),total,page,pageSize});}
  if(resource==="heatmap"&&method==="GET"){const where=filters(url);if(!url.searchParams.get("verdict"))where.verdict={in:["COUNTERFEIT","SUSPICIOUS"]};const rows=await db().scan.findMany({where:{...where,locationConsent:true,lat:{not:null},lng:{not:null}},select:{lat:true,lng:true,verdict:true},take:10000});const cells=new Map<string,{lat:number;lng:number;weight:number}>();for(const row of rows){const lat=Math.round(row.lat!*1000)/1000,lng=Math.round(row.lng!*1000)/1000,key=`${lat}:${lng}`,cell=cells.get(key)??{lat,lng,weight:0};cell.weight+=row.verdict==="COUNTERFEIT"?1:row.verdict==="SUSPICIOUS"?.6:.2;cells.set(key,cell);}return json({points:[...cells.values()],total:rows.length,truncated:rows.length===10000});}
  if(resource==="alerts"&&!id&&method==="GET"){const status=url.searchParams.get("status");const where=status&&status!=="ALL"?{status:z.enum(["NEW","INVESTIGATING","RESOLVED"]).parse(status)}:{};return json({alerts:await db().alert.findMany({where,include:{_count:{select:{scans:true}}},orderBy:{createdAt:"desc"},take:100})});}
  if(resource==="alerts"&&id&&method==="GET"){const alert=await db().alert.findUnique({where:{id:uuid.parse(id)},include:{scans:{include:{scan:{include:{product:true}}}}}});if(!alert)throw new ApiError(404,"Alert not found.","NOT_FOUND");return json({alert:{...alert,scans:alert.scans.map(item=>safeScan(item.scan))}});}
  if(resource==="alerts"&&id&&method==="PATCH"){const input=z.object({status:z.enum(["NEW","INVESTIGATING","RESOLVED"]).optional(),notes:z.string().max(5000).optional(),assigneeId:uuid.nullable().optional()}).parse(await body(request));if(input.assigneeId){const assignee=await db().user.findUnique({where:{id:input.assigneeId}});if(!assignee||assignee.role==="CONSUMER")throw new ApiError(400,"Assign alerts to an administrator.","INVALID_ASSIGNEE");}const alert=await db().$transaction(async tx=>{const saved=await tx.alert.update({where:{id:uuid.parse(id)},data:input});await audit(who,"ALERT_UPDATED",saved.id,input,tx);return saved;});return json({alert});}
  throw new ApiError(404,"Endpoint not found.","NOT_FOUND");
}catch(error){return errorResponse(error);}}
