import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { alertEmail, alertPayload, signWebhook, webhookUrlAllowed, type AlertEvent } from "../src/lib/alert-notify-format";

const event: AlertEvent = { alertId: "a1", kind: "CREATED", severity: "HIGH", scans: 5, centerLat: 24.86071234, centerLng: 67.00112345, radiusKm: 2 };
test("alert payload rounds location and carries no scan or user identifiers",()=>{const payload=alertPayload(event,"https://shelfwatch.example/",new Date("2026-10-22T00:00:00Z"));assert.deepEqual(payload.alert.center,{lat:24.861,lng:67.001});assert.equal(payload.url,"https://shelfwatch.example/admin/alerts");assert.equal(payload.type,"alert.created");assert.doesNotMatch(JSON.stringify(payload),/userId|scanId|serial|guest/);});
test("webhook signature covers timestamp and body",()=>{const body='{"x":1}';assert.equal(signWebhook(body,"secret",100),`sha256=${createHmac("sha256","secret").update(`100.${body}`).digest("hex")}`);assert.notEqual(signWebhook(body,"secret",100),signWebhook(body,"secret",101));});
test("webhooks require HTTPS except for local development",()=>{assert.equal(webhookUrlAllowed("https://hooks.example/x"),true);assert.equal(webhookUrlAllowed("http://hooks.example/x"),false);assert.equal(webhookUrlAllowed("http://localhost:9000/x"),true);assert.equal(webhookUrlAllowed("not a url"),false);});
test("alert email states a cluster is a signal, not proof",()=>{const mail=alertEmail({...event,kind:"ESCALATED",severity:"CRITICAL"},"https://s.example");assert.match(mail.subject,/critical alert: escalated/);assert.match(mail.text,/not proof of counterfeiting/);});
