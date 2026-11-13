const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const listeners={};
const manifest=JSON.parse(fs.readFileSync(require.resolve("../manifest.json"),"utf8"));
assert.ok(manifest.content_scripts.every(script=>script.all_frames===false),
  "Content scripts must run only in the top-level frame to avoid multiplying work in iframe-heavy pages");

const sandbox={console,addEventListener:(t,fn)=>(listeners[t]||=[]).push(fn),dispatchEvent:()=>true,postMessage:()=>{},CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail;}}};
sandbox.window=sandbox;
vm.createContext(sandbox);
// Expose the page realm's built-ins as window properties, like Chromium does.
sandbox.Date=vm.runInContext("Date",sandbox);
sandbox.Intl=vm.runInContext("Intl",sandbox);
vm.runInContext(fs.readFileSync(require.resolve("../main-world.js"),"utf8"),sandbox);
const pageWindow=vm.runInContext("window",sandbox);
const setZone=(timezone,level=4)=>{for(const fn of listeners.message||[])fn({source:pageWindow,data:{__iptz_sync__:true,timezone,level}});};
setZone("Asia/Tehran",4);
const D=vm.runInContext("Date",sandbox),I=vm.runInContext("Intl",sandbox);
const d=new D("2026-01-01T00:00:00.000Z");
assert.equal(d.getTimezoneOffset(),-210);
assert.equal(d.getHours(),3);
assert.equal(d.getMinutes(),30);
assert.equal(new I.DateTimeFormat("en-US").resolvedOptions().timeZone,"Asia/Tehran");
assert.equal(new I.DateTimeFormat("en-US",{timeZone:"Europe/Stockholm"}).resolvedOptions().timeZone,"Europe/Stockholm");
const historical=new D("7/1/1113");
const historicalText=new I.DateTimeFormat("en",{year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",second:"numeric"}).format(historical);
assert.equal(+new D(historicalText),+historical,`Historical Intl-to-Date parse round-trip: ${historicalText}`);
assert.equal(+new D(new D("7/1/1113")),+historical,"Date object construction must preserve its epoch");
assert.equal(D.parse(historicalText),+historical,"Date.parse must use the selected local timezone");
const explicitIso="2026-01-01T00:00:00.000Z";
assert.equal(D.parse(explicitIso),Date.UTC(2026,0,1),"Date.parse must preserve explicit UTC offsets");
assert.ok(Number.isNaN(D.parse("this is not a date")),"Date.parse must retain native invalid-date behavior");
assert.equal(new D(new D(explicitIso)).getTime(),Date.UTC(2026,0,1),"Date constructor must clone a Date instance");
assert.equal(+new D("2026-01-01T00:00:00"),+new D("1/1/2026"),"timezone-less ISO date-time must be local");
assert.equal(+new D("2026-01-01"),Date.UTC(2026,0,1),"ISO date-only must retain UTC semantics");
assert.equal(new D(2026,0,1).getHours(),0,"multi-argument Date constructor must use selected timezone");

const editable=new D("2026-01-01T00:00:00.000Z");
editable.setHours(4);
assert.equal(editable.getHours(),4);
assert.equal(editable.getMinutes(),30);
assert.equal(editable.toISOString(),"2026-01-01T01:00:00.000Z");
setZone("Europe/Stockholm",4);
const dst=new D("2026-03-29T00:30:00.000Z");
dst.setHours(2);
assert.equal(dst.getHours(),3);
assert.equal(dst.getMinutes(),30);

// Level 1 must leave the Date constructor untouched while applying Intl's default timezone.
const lightListeners={};
const light={console,addEventListener:(type,fn)=>(lightListeners[type]||=[]).push(fn),dispatchEvent:()=>true,postMessage:()=>{},CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail;}}};
light.window=light;vm.createContext(light);
light.Date=vm.runInContext("Date",light);light.Intl=vm.runInContext("Intl",light);
const nativeDateBefore=light.Date;
vm.runInContext(fs.readFileSync(require.resolve("../main-world.js"),"utf8"),light);
const lightWindow=vm.runInContext("window",light);
for(const fn of lightListeners.message||[])fn({source:lightWindow,data:{__iptz_sync__:true,timezone:"Asia/Tehran",level:1}});
assert.equal(light.Date,nativeDateBefore,"Level 1 must not replace Date");
assert.equal(new light.Intl.DateTimeFormat("en-US").resolvedOptions().timeZone,"Asia/Tehran","Level 1 must set Intl default timezone");

console.log("Timezone smoke tests passed.");
