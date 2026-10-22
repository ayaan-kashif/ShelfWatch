import test from "node:test";
import assert from "node:assert/strict";
import { phoneNumber, smsCode } from "../src/lib/phone";
import { translate, parseLocale, directionOf } from "../src/lib/i18n/translate";
import { ur } from "../src/lib/i18n/ur";

test("phone numbers must be E.164 after removing spaces and dashes",()=>{assert.equal(phoneNumber.parse("+92 300-123 4567"),"+923001234567");for(const bad of ["03001234567","+0123456789","+92","+92300123456789012","+92abc1234567"])assert.equal(phoneNumber.safeParse(bad).success,false);});
test("SMS codes are exactly six digits",()=>{assert.equal(smsCode.safeParse("123456").success,true);for(const bad of ["12345","1234567","12a456",""])assert.equal(smsCode.safeParse(bad).success,false);});
test("translation falls back to English and fills variables",()=>{assert.equal(translate("ur","A string with no translation"),"A string with no translation");assert.equal(translate("en","Page {page} of {pages}",{page:2,pages:5}),"Page 2 of 5");assert.equal(translate("ur","Page {page} of {pages}",{page:2,pages:5}),"صفحہ 2 از 5");});
test("only Urdu switches to right-to-left",()=>{assert.equal(parseLocale("ur"),"ur");assert.equal(parseLocale("fr"),"en");assert.equal(parseLocale(undefined),"en");assert.equal(directionOf("ur"),"rtl");assert.equal(directionOf("en"),"ltr");});
test("every Urdu entry keeps the same placeholders as its English key",()=>{for(const[en,value]of Object.entries(ur)){const names=(s:string)=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(",");assert.equal(names(value),names(en),en);assert.ok(value.trim().length>0,en);}});
