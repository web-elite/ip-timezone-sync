(() => {
"use strict";
const CHANNEL="__iptz_sync__";
let currentTimezone="UTC", applied=false;

function installTimezoneShim(target, timezone, level = 1) {
  if (!target || !target.Date || !target.Intl) return;
  const DateRef=target.Date, NativeDate=DateRef.__iptzNative||DateRef;
  const DTFRef=target.Intl.DateTimeFormat, NativeDTF=DTFRef.__iptzNative||DTFRef;
  if (DateRef.__iptzTimezone===timezone && NativeDate.__iptzPatched) return;
  const proto=NativeDate.prototype;
  const nativeGetTime=proto.getTime;
  let originals=NativeDate.__iptzOriginals;
  if (!originals) {
    originals={
      local:Object.fromEntries(["setFullYear","setMonth","setDate","setHours","setMinutes","setSeconds","setMilliseconds","setYear"].map(n=>[n,proto[n]])),
      locale:Object.fromEntries(["toLocaleString","toLocaleDateString","toLocaleTimeString"].map(n=>[n,proto[n]])),
      parse:NativeDate.parse
    };
    Object.defineProperty(NativeDate,"__iptzOriginals",{value:originals});
  }
  // Migrate metadata created by v1.0.x, which did not store Date.parse.
  if(typeof originals.parse!=="function") originals.parse=NativeDate.parse;
  // Keep a small LRU cache: hostile or highly dynamic pages must not grow it forever.
  const cache=new Map();
  const MAX_FORMATTERS=32;
  const fmt=(locale="en-US",options={})=>{
    const key=JSON.stringify([locale,options]);
    if(cache.has(key)){
      const formatter=cache.get(key);
      cache.delete(key);
      cache.set(key,formatter);
      return formatter;
    }
    const formatter=new NativeDTF(locale,options);
    if(cache.size>=MAX_FORMATTERS) cache.delete(cache.keys().next().value);
    cache.set(key,formatter);
    return formatter;
  };
  const partsAt=date=>{
    const out={};
    for(const p of fmt("en-US",{timeZone:timezone,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",weekday:"short",hour:"2-digit",minute:"2-digit",second:"2-digit"}).formatToParts(date))
      if(p.type!=="literal") out[p.type]=p.value;
    out.hour=Number(out.hour)%24; out.millisecond=date.getUTCMilliseconds(); return out;
  };
  const wallEpoch=p=>{
    const d=new NativeDate(0);
    d.setUTCFullYear(Number(p.year),Number(p.month)-1,Number(p.day));
    d.setUTCHours(Number(p.hour),Number(p.minute),Number(p.second),Number(p.millisecond||0));
    return d.getTime();
  };
  const offsetAt=date=>(date.getTime()-wallEpoch(partsAt(date)))/60000;
  const sameWall=(a,b)=>a.year===b.year&&a.month===b.month&&a.day===b.day&&a.hour===b.hour&&a.minute===b.minute&&a.second===b.second&&a.millisecond===b.millisecond;
  // Ambiguous local times choose the earlier instant; DST gaps move forward.
  const localToEpoch=wall=>{
    const naive=wallEpoch(wall), offsets=new Set();
    // Three probes cover the offsets on both sides of ordinary DST transitions.
    // The previous 33-probe scan made every local Date construction needlessly expensive.
    for(const hours of [-36,0,36]){
      const value=offsetAt(new NativeDate(naive+hours*3600000));
      if(Number.isFinite(value)) offsets.add(value);
    }
    const exact=[],afterGap=[];
    for(const offset of offsets){
      const candidate=new NativeDate(naive+offset*60000), actual=partsAt(candidate);
      if(sameWall(actual,wall)) exact.push(candidate.getTime());
      else { const delta=wallEpoch(actual)-naive; if(delta>0) afterGap.push({delta,epoch:candidate.getTime()}); }
    }
    if(exact.length) return Math.min(...exact);
    if(afterGap.length){afterGap.sort((a,b)=>a.delta-b.delta);return afterGap[0].epoch;}
    const fallback=offsetAt(new NativeDate(naive));return Number.isFinite(fallback)?naive+fallback*60000:NaN;
  };
  // Parse the local wall-time formats emitted by Intl.DateTimeFormat("en", ...).
  // ISO strings with an explicit offset (or date-only ISO strings) remain native UTC/offset parses.
  const parseLocalDateString=value=>{
    const input=value.trim();
    let m=/^(\d{1,2})\/(\d{1,2})\/(\d{1,6})(?:,\s*(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?\s*(AM|PM)?)?$/i.exec(input);
    if(m){
      let hour=Number(m[4]||0);
      const marker=(m[8]||"").toUpperCase();
      if(marker){if(hour<1||hour>12)return {matched:true,epoch:NaN};hour=(hour%12)+(marker==="PM"?12:0);}
      const wall={year:Number(m[3]),month:Number(m[1]),day:Number(m[2]),hour,minute:Number(m[5]||0),second:Number(m[6]||0),millisecond:Number((m[7]||"").padEnd(3,"0")||0)};
      return {matched:true,epoch:localToEpoch(wall)};
    }
    m=/^(\d{4,6})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(input);
    if(m){
      const wall={year:Number(m[1]),month:Number(m[2]),day:Number(m[3]),hour:Number(m[4]),minute:Number(m[5]),second:Number(m[6]||0),millisecond:Number((m[7]||"").padEnd(3,"0")||0)};
      return {matched:true,epoch:localToEpoch(wall)};
    }
    return {matched:false,epoch:NaN};
  };
  const localNumericConstructor=args=>{
    const values=args.slice(0,7).map(value=>+value);
    let [year,month=0,day=1,hour=0,minute=0,second=0,millisecond=0]=values;
    if(year>=0&&year<=99)year+=1900;
    const wall=new NativeDate(0);
    wall.setUTCFullYear(year,month,day);
    wall.setUTCHours(hour,minute,second,millisecond);
    if(Number.isNaN(wall.getTime()))return NaN;
    return localToEpoch({
      year:wall.getUTCFullYear(),month:wall.getUTCMonth()+1,day:wall.getUTCDate(),
      hour:wall.getUTCHours(),minute:wall.getUTCMinutes(),second:wall.getUTCSeconds(),
      millisecond:wall.getUTCMilliseconds()
    });
  };
  const weekday=s=>["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(s);
  const pad=n=>String(n).padStart(2,"0");
  const zoneName=date=>{
    try{return fmt("en-US",{timeZone:timezone,timeZoneName:"long"}).formatToParts(date).find(p=>p.type==="timeZoneName")?.value||timezone;}
    catch(_){return timezone;}
  };
  const dateString=date=>{
    if(Number.isNaN(date.getTime())) return "Invalid Date";
    const p=partsAt(date), off=Math.round(offsetAt(date)), sign=off<=0?"+":"-", abs=Math.abs(off);
    const month=fmt("en-US",{timeZone:timezone,month:"short"}).format(date);
    return p.weekday+" "+month+" "+pad(Number(p.day))+" "+p.year+" "+pad(p.hour)+":"+pad(Number(p.minute))+":"+pad(Number(p.second))+
      " GMT"+sign+pad(Math.floor(abs/60))+pad(abs%60)+" ("+zoneName(date)+")";
  };
  const DTFProxy=new Proxy(NativeDTF,{
    construct(Ctor,args,NewTarget){
      const opts=args[1]?{...args[1]}:{};
      if(opts.timeZone==null) opts.timeZone=timezone;
      return Reflect.construct(Ctor,[args[0],opts],NewTarget===DTFProxy?Ctor:NewTarget);
    },
    apply(Ctor,thisArg,args){
      const opts=args[1]?{...args[1]}:{};
      if(opts.timeZone==null) opts.timeZone=timezone;
      return Reflect.apply(Ctor,thisArg,[args[0],opts]);
    }
  });
  Object.defineProperty(DTFProxy,"__iptzNative",{value:NativeDTF});
  try{target.Intl.DateTimeFormat=DTFProxy;}catch(_){}

  const getters={
    getFullYear:d=>Number(partsAt(d).year),getMonth:d=>Number(partsAt(d).month)-1,
    getDate:d=>Number(partsAt(d).day),getHours:d=>partsAt(d).hour,
    getMinutes:d=>Number(partsAt(d).minute),getSeconds:d=>Number(partsAt(d).second),
    getDay:d=>weekday(partsAt(d).weekday),getYear:d=>Number(partsAt(d).year)-1900
  };
  for(const [name,getter] of Object.entries(getters)){
    try{Object.defineProperty(proto,name,{configurable:true,writable:true,value:function(){return Number.isNaN(this.getTime())?NaN:getter(this);}});}catch(_){}
  }
  try{
    Object.defineProperty(proto,"getMilliseconds",{configurable:true,writable:true,value:function(){return this.getUTCMilliseconds();}});
    Object.defineProperty(proto,"getTimezoneOffset",{configurable:true,writable:true,value:function(){return Number.isNaN(this.getTime())?NaN:Math.round(offsetAt(this));}});
    Object.defineProperty(proto,"toString",{configurable:true,writable:true,value:function(){return dateString(this);}});
    Object.defineProperty(proto,"toDateString",{configurable:true,writable:true,value:function(){
      if(Number.isNaN(this.getTime()))return "Invalid Date";
      const p=partsAt(this),m=fmt("en-US",{timeZone:timezone,month:"short"}).format(this);
      return p.weekday+" "+m+" "+pad(Number(p.day))+" "+p.year;
    }});
    Object.defineProperty(proto,"toTimeString",{configurable:true,writable:true,value:function(){
      if(Number.isNaN(this.getTime()))return "Invalid Date";
      const p=partsAt(this),off=Math.round(offsetAt(this)),sign=off<=0?"+":"-",abs=Math.abs(off);
      return pad(p.hour)+":"+pad(Number(p.minute))+":"+pad(Number(p.second))+" GMT"+sign+pad(Math.floor(abs/60))+pad(abs%60)+" ("+zoneName(this)+")";
    }});
  }catch(_){}
  for(const [name,original] of Object.entries(originals.locale)){
    try{Object.defineProperty(proto,name,{configurable:true,writable:true,value:function(locales,options){
      const opts=options?{...options}:{};
      if(opts.timeZone==null)opts.timeZone=timezone;
      return Reflect.apply(original,this,[locales,opts]);
    }});}catch(_){}
  }

  if(level<=2) return;

  const setterMap={setFullYear:"setUTCFullYear",setMonth:"setUTCMonth",setDate:"setUTCDate",setHours:"setUTCHours",setMinutes:"setUTCMinutes",setSeconds:"setUTCSeconds",setMilliseconds:"setUTCMilliseconds"};
  for(const [localName,utcName] of Object.entries(setterMap)){
    const nativeUtcSetter=proto[utcName];
    try{Object.defineProperty(proto,localName,{configurable:true,writable:true,value:function(...args){
      if(Number.isNaN(this.getTime()))return originals.local[localName].apply(this,args);
      const p=partsAt(this),wall=new NativeDate(0);
      wall.setUTCFullYear(Number(p.year),Number(p.month)-1,Number(p.day));
      wall.setUTCHours(p.hour,Number(p.minute),Number(p.second),Number(p.millisecond));
      nativeUtcSetter.apply(wall,args);
      const next={year:wall.getUTCFullYear(),month:wall.getUTCMonth()+1,day:wall.getUTCDate(),hour:wall.getUTCHours(),minute:wall.getUTCMinutes(),second:wall.getUTCSeconds(),millisecond:wall.getUTCMilliseconds()};
      return NativeDate.prototype.setTime.call(this,localToEpoch(next));
    }});}catch(_){}
  }
  try{Object.defineProperty(proto,"setYear",{configurable:true,writable:true,value:function(year){
    const n=Number(year); if(!Number.isFinite(n))return originals.local.setYear.call(this,year);
    return this.setFullYear(n>=0&&n<=99?n+1900:n);
  }});}catch(_){}

  const DateProxy=new Proxy(NativeDate,{
    get(Ctor,property,receiver){
      if(property==="__iptzNative")return NativeDate;
      if(property==="__iptzTimezone")return timezone;
      if(property==="parse")return function(value){
        if(typeof value==="string"){const parsed=parseLocalDateString(value);if(parsed.matched)return parsed.epoch;}
        return Reflect.apply(originals.parse,NativeDate,[value]);
      };
      return Reflect.get(Ctor,property,receiver);
    },
    apply(){return dateString(new NativeDate());},
    construct(Ctor,args,NewTarget){
      const actualNewTarget=NewTarget===DateProxy?NativeDate:NewTarget;
      if(args.length===1){
        try{return Reflect.construct(Ctor,[Reflect.apply(nativeGetTime,args[0],[])],actualNewTarget);}catch(_){}
        if(typeof args[0]==="string"){
          const parsed=parseLocalDateString(args[0]);
          if(parsed.matched)return Reflect.construct(Ctor,[parsed.epoch],actualNewTarget);
        }
      }
      if(args.length>=2)return Reflect.construct(Ctor,[localNumericConstructor(args)],actualNewTarget);
      return Reflect.construct(Ctor,args,actualNewTarget);
    }
  });
  Object.defineProperty(NativeDate,"__iptzPatched",{value:true,configurable:true});
  try{target.Date=DateProxy;}catch(_){}
}

function apply(timezone){
  if(typeof timezone!=="string"||!timezone)return;
  const DTF=window.Intl.DateTimeFormat,NativeDTF=DTF.__iptzNative||DTF;
  try{new NativeDTF("en-US",{timeZone:timezone});}catch(_){return;}
  currentTimezone=timezone; installTimezoneShim(window,timezone,level); applied=true;
  window.dispatchEvent(new CustomEvent("iptz:updated",{detail:{timezone}}));
  window.postMessage({[CHANNEL]:true,ack:true,timezone},"*");
}
window.addEventListener("message",event=>{
  if(event.source===window&&event.data?.[CHANNEL]===true&&typeof event.data.timezone==="string")apply(event.data.timezone,event.data.level);
});
Object.defineProperty(window,"__IP_TIMEZONE_SYNC__",{configurable:false,value:{get timezone(){return currentTimezone;},get applied(){return applied;}}});
window.postMessage({[CHANNEL]:true,ready:true},"*");
})();