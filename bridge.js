(() => {
  const CHANNEL="__iptz_sync__"; let latestTimezone="", latestLevel=1;
  const send=(timezone,level=1)=>{if(!timezone)return;latestTimezone=timezone;latestLevel=level;window.postMessage({[CHANNEL]:true,timezone,level},"*");};
  window.addEventListener("message",event=>{
    if(event.source===window&&event.data?.[CHANNEL]===true&&event.data.ready&&latestTimezone)send(latestTimezone,latestLevel);
  });
  chrome.runtime.sendMessage({type:"GET_CONFIG"}).then(config=>{if(config?.timezone)send(config.timezone,config.level);}).catch(()=>{});
  chrome.runtime.onMessage.addListener(message=>{if(message?.type==="IPTZ_UPDATE"&&message.timezone)send(message.timezone,message.level);});
})();