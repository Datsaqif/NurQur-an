// Sumber: AlQuran Cloud (api.alquran.cloud), AlAdhan (api.aladhan.com), Nominatim/OpenStreetMap. Semua tanpa API key.
const J=async(u,t=12000)=>{const c=new AbortController(),i=setTimeout(()=>c.abort(),t);try{const r=await fetch(u,{signal:c.signal});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}catch(e){throw e.name==='AbortError'?new Error('waktu habis'):e}finally{clearTimeout(i)}};
export const store={get(k,d){try{const v=localStorage.getItem('nq:'+k);return v?JSON.parse(v):d}catch{return d}},set(k,v){try{localStorage.setItem('nq:'+k,JSON.stringify(v))}catch{}},del(k){try{localStorage.removeItem('nq:'+k)}catch{}}};
const cached=async(k,ttl,fn)=>{const c=store.get('c:'+k);if(c&&Date.now()-c.t<ttl)return c.v;const v=await fn();store.set('c:'+k,{t:Date.now(),v});return v};
const Q='https://api.alquran.cloud/v1',DAY=864e5;
export const surahList=()=>cached('sl',30*DAY,async()=>{const j=await J(Q+'/surah');if(!Array.isArray(j.data)||j.data.length!==114)throw new Error('respons daftar surah tidak valid');return j.data});
export const surah=(n,qari)=>cached(`s${n}${qari}`,30*DAY,async()=>{const j=await J(`${Q}/surah/${n}/editions/quran-uthmani,id.indonesian,${qari}`,25000);const[a,t,u]=j.data||[];if(!a||!t||!u||a.ayahs.length!==t.ayahs.length||a.ayahs.length!==u.ayahs.length)throw new Error('respons surah tidak valid');return{n,ayahs:a.ayahs.map((x,i)=>({i:x.numberInSurah,g:x.number,ar:x.text,id:t.ayahs[i].text,au:u.ayahs[i].audio}))}});
export const search=q=>J(`${Q}/search/${encodeURIComponent(q)}/all/id.indonesian`).then(j=>j.data?.matches||[]).catch(e=>/404/.test(e.message)?[]:Promise.reject(e));
export const ayahRef=ref=>cached('r'+ref,30*DAY,async()=>{const j=await J(`${Q}/ayah/${ref}/editions/quran-uthmani,id.indonesian`);const[a,t]=j.data||[];if(!a||!t)throw new Error('respons ayat tidak valid');return{ar:a.text,id:t.text,name:a.surah.englishName,s:a.surah.number,i:a.numberInSurah}});
const NM='https://nominatim.openstreetmap.org/';
const nm=r=>r.display_name.split(',').slice(0,3).join(',').trim();
export const geocode=async q=>(await J(`${NM}search?format=jsonv2&countrycodes=id&limit=6&accept-language=id&q=${encodeURIComponent(q)}`)).map(r=>({name:nm(r),lat:+r.lat,lon:+r.lon}));
export const reverseGeo=async(lat,lon)=>{try{const r=await J(`${NM}reverse?format=jsonv2&accept-language=id&lat=${lat}&lon=${lon}`);const a=r.address||{};return[a.city||a.county||a.town||a.village,a.state].filter(Boolean).join(', ')||nm(r)}catch{return`${lat.toFixed(2)}, ${lon.toFixed(2)}`}};
export const fetchDay=(loc,[y,m,d],s)=>cached(`p${loc.lat.toFixed(2)},${loc.lon.toFixed(2)}|${y}-${m}-${d}|${s.method}|${s.school}`,14*DAY,async()=>{
 const p=n=>String(n).padStart(2,'0');
 const j=await J(`https://api.aladhan.com/v1/timings/${p(d)}-${p(m)}-${y}?latitude=${loc.lat}&longitude=${loc.lon}&method=${s.method}&school=${s.school}`);
 const t=j.data?.timings,tz=j.data?.meta?.timezone;if(!t||!tz)throw new Error('respons jadwal tidak valid');
 const g=k=>{const x=/(\d{1,2}):(\d{2})/.exec(t[k]||'');if(!x)throw new Error('waktu '+k+' tidak valid');return[+x[1],+x[2]]};
 return{tz,method:j.data.meta.method?.name,hijri:j.data.date?.hijri,t:Object.fromEntries(['Imsak','Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'].map(k=>[k,g(k)]))}});
