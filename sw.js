const SHELL="leergut-shell-v1",EXT="leergut-ext-v1";
const FILES=["./","./index.html","./manifest.json","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(SHELL).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==SHELL&&k!==EXT).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin===location.origin){
    if(url.pathname.endsWith("/data.json")){
      /* Daten: erst Netz (aktuell), sonst letzter Stand */
      e.respondWith((async()=>{
        const key=new Request(url.origin+url.pathname);
        try{
          const r=await fetch(req);
          if(r&&r.ok)(await caches.open(SHELL)).put(key,r.clone());
          return r;
        }catch(err){
          const c=await caches.match(key);
          if(c)return c;
          throw err;
        }
      })());
      return;
    }
    /* App-Dateien: sofort aus dem Speicher, im Hintergrund aktualisieren */
    e.respondWith((async()=>{
      const c=await caches.open(SHELL);
      const hit=await c.match(req,{ignoreSearch:true});
      const net=fetch(req).then(r=>{if(r&&r.ok)c.put(req,r.clone());return r}).catch(()=>null);
      return hit||(await net)||new Response("Offline",{status:503});
    })());
    return;
  }
  /* Fremde Dateien (Bildmodell, Bibliotheken): einmal laden, dann aus dem Speicher */
  e.respondWith((async()=>{
    const c=await caches.open(EXT);
    const hit=await c.match(req);
    if(hit)return hit;
    const r=await fetch(req);
    if(r&&(r.ok||r.type==="opaque"))c.put(req,r.clone());
    return r;
  })());
});
