const C='nq1',S=['./','index.html','assets/css/style.css','assets/js/app.js','assets/js/services.js','assets/js/prayer.js'];
addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(S))));
addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||r.destination==='audio'||r.headers.has('range'))return;
e.respondWith(fetch(r).then(x=>{if(x.status===200){const k=x.clone();caches.open(C).then(c=>c.put(r,k))}return x}).catch(()=>caches.match(r)))});
