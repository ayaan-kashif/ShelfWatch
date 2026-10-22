import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base='http://localhost:3001';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const passed=[];
try{
 await fs.mkdir('test-results/redesign',{recursive:true});
 await page.goto(base,{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:'Know what’s in your hands.'}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const art=page.locator('.landing-hero .art-package');const before=await art.evaluate(el=>getComputedStyle(el).transform);await page.waitForTimeout(500);const after=await art.evaluate(el=>getComputedStyle(el).transform);assert.notEqual(before,after);
 await page.getByRole('button',{name:'Pause illustration animation'}).click();assert.equal(await art.evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
 await page.getByRole('button',{name:'Play illustration animation'}).click();passed.push('Visible 3D animation runs and pause/play controls work.');
 await page.screenshot({path:'test-results/redesign/landing-light-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Switch to dark mode'}).click();await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
 await page.screenshot({path:'test-results/redesign/landing-dark-desktop.png',fullPage:true});passed.push('Theme changes and persists after reload.');
 for(const width of [1024,768,375]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.screenshot({path:'test-results/redesign/landing-dark-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Switch to light mode'}).click();await page.waitForTimeout(350);await page.screenshot({path:'test-results/redesign/landing-light-mobile.png',fullPage:true});passed.push('Landing has no overflow at375,768,1024 and1440px.');
 await page.goto(base+'/login',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Welcome back.'}).waitFor();await page.getByLabel('Email address').waitFor();
 await page.getByRole('tab',{name:'Create account'}).click();await page.getByLabel('Your name').waitFor();await page.getByRole('button',{name:'Show password'}).click();assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'text');
 await page.screenshot({path:'test-results/redesign/signup-light-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/login',{waitUntil:'networkidle'});await page.screenshot({path:'test-results/redesign/login-light-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Switch to dark mode'}).click();await page.waitForTimeout(350);await page.screenshot({path:'test-results/redesign/login-dark-desktop.png',fullPage:true});passed.push('Sign-in, create-account and password visibility controls work at desktop/mobile.');
 await page.goto(base+'/login?mode=forgot',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Forgot your password?'}).waitFor();
 const invalidReset=await page.request.post(base+'/api/auth/reset-password',{data:{email:'invalid'}});assert.equal(invalidReset.status(),400);
 const protectedUpdate=await page.request.post(base+'/api/auth/update-password',{data:{password:'TestOnly123456!'}});assert.equal(protectedUpdate.status(),401);
 await page.goto(base+'/login?mode=reset',{waitUntil:'networkidle'});await page.getByLabel('New password',{exact:true}).fill('TestOnly123456!');await page.getByLabel('Confirm password').fill('Different123456!');await page.getByRole('button',{name:'Update password',exact:true}).click();await page.getByRole('alert').filter({hasText:'Your passwords do not match.'}).waitFor();
 passed.push('Recovery screens validate input; password updates reject unauthenticated requests.');

 for(const path of ['/dashboard','/scan','/rewards','/settings']){await page.goto(base+path,{waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.goto(base+'/dashboard',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Switch to light mode'}).click();await page.waitForTimeout(350);await page.screenshot({path:'test-results/redesign/dashboard-light.png',fullPage:true});
 await page.goto(base+'/scan',{waitUntil:'networkidle'});await page.screenshot({path:'test-results/redesign/scan-light.png',fullPage:true});passed.push('Application routes preserve functionality and share both themes.');
 const reduced=await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:1000}});const rp=await reduced.newPage();await rp.goto(base,{waitUntil:'networkidle'});assert.equal(await rp.locator('.landing-hero .art-package').evaluate(el=>getComputedStyle(el).animationName),'none');await reduced.close();passed.push('Reduced motion disables continuous animation.');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed,errors},null,2));await fs.writeFile('test-results/redesign/results.json',JSON.stringify({passed,errors},null,2));
}finally{await browser.close();}
