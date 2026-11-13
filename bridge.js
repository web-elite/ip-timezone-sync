(() => {
  const CHANNEL="__iptz_sync__"; let latestTimezone="";
  const send=timezone=>{if(!timezone)return;latestTimezone=timezone;window.postMessage({[CHANNEL]:true,timezone},"*");};
  window.addEventListener("message",event=>{
    if(event.source===window&&event.data?.[CHANNEL]===true&&event.data.ready&&latestTimezone)send(latestTimezone);
  });
  chrome.runtime.sendMessage({type:"GET_CONFIG"}).then(config=>{if(config?.timezone)send(config.timezone);}).catch(()=>{});
  chrome.runtime.onMessage.addListener(message=>{if(message?.type==="IPTZ_UPDATE"&&message.timezone)send(message.timezone);});
})();