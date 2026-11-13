const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const listeners=Object.create(null);
const sandbox={console,addEventListener(type,fn){(listeners[type]||=[]).push(fn);},dispatchEvent(){return true;},postMessage(){},CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail;}}};
sandbox.window=sandbox;
vm.createContext(sandbox);
sandbox.Date=vm.runInContext("Date",sandbox);
sandbox.Intl=vm.runInContext("Intl",sandbox);
vm.runInContext(fs.readFileSync(require.resolve("../main-world.js"),"utf8"),sandbox);
const pageWindow=vm.runInContext("window",sandbox);
const setZone=timezone=>{for(const fn of listeners.message||[])fn({source:pageWindow,data:{__iptz_sync__:true,timezone}});};
const zones=Intl.supportedValuesOf("timeZone");
for(const zone of zones){
  setZone(zone);
  const D=vm.runInContext("Date",sandbox);
  const I=vm.runInContext("Intl",sandbox);
  const source=new D("7/1/1113");
  const formatted=new I.DateTimeFormat("en",{timeZone:zone,year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",second:"numeric"}).format(source);
  const reparsed=new D(formatted);
  assert.equal(+reparsed,+source,`${zone}: ${formatted}`);
}
console.log(`Historical Intl-to-Date parsing passed for ${zones.length} IANA time zones.`);