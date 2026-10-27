import { store, surahList, surah, search, ayahRef, reverseGeo, geocode, fetchDay } from './services.js';
import { NAMES, MAIN, ymdOf, addDay, entriesFor, state, fmtCD, tzFmt } from './prayer.js';
const h = (t, a = {}, ...c) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v) } e.append(...c.flat().filter(x => x != null && x !== false)); return e };
const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s), main = $('#app');
const D = { method: 20, school: 0, arSize: 34, trSize: 16, lh: 2.2, theme: 'light', notif: false, sound: false, qari: 'ar.alafasy', vol: 1, rate: 1 };
const first = !store.get('set'); let set = { ...D, ...store.get('set', {}) }; if (first && matchMedia('(prefers-color-scheme:dark)').matches) set.theme = 'dark';
let loc = store.get('loc', null), tz = loc?.tz || Intl.DateTimeFormat().resolvedOptions().timeZone, days = {}, curDay = '', sim = null, err = '', lastId, ac;
const theme = () => { const s = document.documentElement.style; document.documentElement.dataset.theme = set.theme; s.setProperty('--ar', set.arSize + 'px'); s.setProperty('--tr', set.trSize + 'px'); s.setProperty('--lh', set.lh) };
const save = () => { store.set('set', set); theme() }; theme();
const ZN = { 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' };
let tt; const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 6000) };
const beep = () => { if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 660; g.gain.value = .25 * set.vol; o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + .8) };
const hhmm = ([a, b]) => String(a).padStart(2, '0') + '.' + String(b).padStart(2, '0');
/* ---------- jadwal salat ---------- */
async function loadDays() {
  days = {}; err = ''; if (!loc) { err = 'Pilih lokasi untuk menampilkan jadwal salat.'; return }
  const t = ymdOf(Date.now(), tz); curDay = t.join('-');
  for (const [i, ymd] of [[0, t], [1, addDay(t, 1)]]) { try { const d = await fetchDay(loc, ymd, set); days[ymd.join('-')] = { ymd, d }; if (i === 0 && d.tz !== tz) { tz = d.tz; loc.tz = tz; store.set('loc', loc); return loadDays() } } catch (e) { if (i === 0) err = 'Jadwal belum dapat diperbarui (' + e.message + '). Periksa koneksi lalu coba lagi.' } }
}
const entries = () => sim ? sim.e : Object.values(days).flatMap(x => entriesFor(x.ymd, x.d)).sort((a, b) => a.ts - b.ts);
function startSim() { const n = Date.now(); sim = { e: [...MAIN, 'Fajr'].map((k, i) => ({ id: 'sim' + i, k, name: NAMES[k] + (i === 5 ? ' (hari berikutnya)' : ''), ts: n + 8000 + i * 12000 })) }; lastId = undefined; paint() }
function fire(e) {
  if (store.get('nf') === e.id) return; store.set('nf', e.id); if (!set.notif) return; const m = `Waktu ${e.name} telah tiba${loc ? ' untuk ' + loc.name : ''}`; toast(m);
  if ('Notification' in window && Notification.permission === 'granted') new Notification('NurQur’an', { body: m }); if (set.sound) beep()
}
function hijri(now) { const d = days[curDay]?.d?.hijri; return d ? `${d.day} ${d.month.en} ${d.year} H` : new Intl.DateTimeFormat('id-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(now) }
function paint() {
  const now = Date.now(), E = entries(), { cur, next } = state(E, now), tm = { hour: '2-digit', minute: '2-digit' };
  const S = (b, v) => $$(`[data-b=${b}]`).forEach(x => { if (x.textContent !== v) x.textContent = v });
  const today = days[curDay]?.d;
  S('clock', tzFmt(now, tz, { ...tm, second: '2-digit' }) + ' ' + (ZN[tz] || '')); S('date', tzFmt(now, tz, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  S('dates', hijri(now) + ' · ' + tzFmt(now, tz, { day: 'numeric', month: 'short', year: 'numeric' })); S('loc', loc ? loc.name : 'Lokasi belum dipilih');
  S('nextname', next ? next.name : '—'); S('nexttime', next ? tzFmt(next.ts, tz, tm) : '—'); S('cd', next ? fmtCD(next.ts - now) : '--:--:--');
  S('cur', cur ? `Waktu ${cur.name} telah masuk sejak ${tzFmt(cur.ts, tz, tm)}` : 'Belum masuk waktu Subuh / menunggu data');
  S('err', err); S('sim', sim ? 'SIMULASI — jadwal contoh, bukan jadwal salat sebenarnya' : '');
  S('method', today ? `Metode: ${today.method || '-'} · ${tz}` : ''); S('extra', today && !sim ? `Imsak ${hhmm(today.t.Imsak)} · Syuruq ${hhmm(today.t.Sunrise)}` : '');
  const cs = sim ? E.slice(0, 5) : E.filter(e => e.id.startsWith(curDay));
  $$('[data-k]').forEach(c => {
    const e = cs.find(x => x.k === c.dataset.k), st = !e ? '' : cur && cur.id === e.id ? 'now' : e.ts <= now ? 'past' : next && next.id === e.id ? 'next' : '';
    c.dataset.s = st; c.querySelector('.t').textContent = e ? tzFmt(e.ts, tz, tm) : '--.--'; c.querySelector('.s').textContent = { now: `Waktu ${NAMES[c.dataset.k]} telah tiba`, past: 'Sudah lewat', next: 'Berikutnya', '': 'Belum masuk' }[st]
  });
  if (E.length) { if (cur && cur.id !== lastId) { if (lastId !== undefined && now - cur.ts < 90000) fire(cur); lastId = cur.id } else if (!cur && lastId === undefined) lastId = null }
}
function tick() { if (!sim && loc && ymdOf(Date.now(), tz).join('-') !== curDay) { curDay = ymdOf(Date.now(), tz).join('-'); loadDays().then(paint) } paint() }
setInterval(tick, 1000); document.addEventListener('visibilitychange', () => { if (!document.hidden) tick() });
/* ---------- lokasi ---------- */
async function setLoc(l) { loc = l; store.set('loc', loc); toast('Memuat jadwal untuk ' + l.name + '…'); await loadDays(); paint(); if (err) toast(err) }
function locPicker() {
  const q = h('input', { type: 'search', 'aria-label': 'Cari kota atau kabupaten', placeholder: 'Cari kota/kabupaten di Indonesia' }), res = h('div', { class: 'chips' }), msg = h('p', { class: 'muted' });
  const go = async () => { if (q.value.trim().length < 3) { msg.textContent = 'Ketik minimal 3 huruf.'; return } msg.textContent = 'Mencari…'; res.replaceChildren(); try { const r = await geocode(q.value.trim()); msg.textContent = r.length ? '' : 'Tidak ada hasil.'; r.forEach(x => res.append(h('button', { onclick: () => setLoc({ name: x.name, lat: x.lat, lon: x.lon }) }, x.name))) } catch (e) { msg.textContent = 'Pencarian gagal: ' + e.message } };
  q.addEventListener('keydown', e => e.key === 'Enter' && go());
  const gps = () => {
    if (!navigator.geolocation) { msg.textContent = 'Browser tidak mendukung Geolocation. Pilih kota secara manual.'; return } msg.textContent = 'Meminta lokasi…';
    navigator.geolocation.getCurrentPosition(async p => { const { latitude: lat, longitude: lon } = p.coords; msg.textContent = ''; setLoc({ name: await reverseGeo(lat, lon), lat, lon }) }, e => { msg.textContent = e.code === 1 ? 'Izin lokasi ditolak. Silakan cari kota secara manual.' : 'Lokasi tidak dapat dideteksi. Silakan cari kota secara manual.' }, { timeout: 15000 })
  };
  return h('div', { class: 'card' }, h('h3', {}, 'Lokasi'), h('p', {}, 'Lokasi saat ini: ', h('b', { 'data-b': 'loc' })), h('div', { class: 'chips' }, h('button', { class: 'pri', onclick: gps }, '📍 Gunakan lokasi saya / perbarui'), q, h('button', { onclick: go }, 'Cari')), msg, res)
}
function prayerCard() {
  return h('section', { class: 'card' }, h('p', { class: 'muted' }, '📍 ', h('b', { 'data-b': 'loc' }), ' · ', h('span', { 'data-b': 'date' })),
    h('div', { class: 'clock', 'data-b': 'clock' }), h('p', { class: 'sim', 'data-b': 'sim' }),
    h('p', {}, 'Salat berikutnya: ', h('b', { 'data-b': 'nextname' }), ' pukul ', h('b', { 'data-b': 'nexttime' })), h('div', { class: 'cd', 'data-b': 'cd', role: 'timer' }),
    h('p', { 'data-b': 'cur' }), h('p', { class: 'muted' }, 'Status menunjukkan masuknya waktu salat menurut jadwal, bukan bukti salat sedang atau sudah dilaksanakan.'),
    h('p', { class: 'err', 'data-b': 'err' }),
    h('div', { class: 'grid' }, MAIN.map(k => h('div', { class: 'pc', 'data-k': k }, h('b', {}, NAMES[k]), h('span', { class: 't' }, '--.--'), h('small', { class: 's' })))),
    h('p', { class: 'muted', 'data-b': 'extra' }), h('p', { class: 'muted', 'data-b': 'method' }))
}
/* ---------- audio ---------- */
const A = new Audio(); let ays = [], idx = -1, single = false, abar = null;
function stopAudio() { A.pause(); A.removeAttribute('src'); idx = -1; $$('.ay.playing').forEach(x => x.classList.remove('playing')); abar = null }
function playIdx(i) {
  if (i < 0 || i >= ays.length) return stopAudio(); idx = i; $$('.ay.playing').forEach(x => x.classList.remove('playing')); const r = $('#a' + ays[i].i); r?.classList.add('playing'); r?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  A.src = ays[i].au; A.playbackRate = set.rate; A.volume = set.vol; A.play().catch(() => toast('Audio gagal dimuat. Periksa koneksi atau pilih qari lain.')); saveLast(ays[i])
}
A.addEventListener('ended', () => single ? stopAudio() : playIdx(idx + 1)); A.addEventListener('error', () => { if (A.src) toast('Audio ayat gagal dimuat.') });
let cs = 0; const saveLast = a => { if (cs && a) store.set('last', { s: cs, i: a.i, g: a.g }) };
/* ---------- tampilan ---------- */
const loading = () => main.replaceChildren(h('p', { class: 'muted' }, 'Memuat…'));
const sRow = m => h('a', { class: 'card sr', href: '#/surah/' + m.number }, h('div', { class: 'n' }, h('span', {}, m.number)), h('div', {}, h('b', {}, m.englishName), h('div', { class: 'muted' }, `${m.englishNameTranslation} · ${m.numberOfAyahs} ayat · ${m.revelationType === 'Meccan' ? 'Makkiyah' : 'Madaniyah'}`)), h('div', { class: 'a', lang: 'ar' }, m.name));
const AY = ['2:255', '94:5', '13:28', '65:3', '2:286', '59:22'];
const ayCard = async (ref, title) => { const c = h('div', { class: 'card' }, h('h3', {}, title || 'Ayat'), h('p', { class: 'muted' }, 'Memuat…')); try { const a = await ayahRef(ref); c.replaceChildren(h('h3', {}, title || 'Ayat Pilihan Hari Ini'), h('div', { class: 'ar', lang: 'ar' }, a.ar), h('p', {}, a.id), h('p', { class: 'muted' }, `QS. ${a.name} (${a.s}): ${a.i} · sumber: AlQuran Cloud · `, h('a', { href: `#/surah/${a.s}/${a.i}` }, 'Buka bacaan'))) } catch (e) { c.replaceChildren(h('h3', {}, title || 'Ayat'), h('p', { class: 'err' }, 'Gagal memuat (' + e.message + ').')) } return c };
async function home() {
  const l = await surahList(), last = store.get('last', null), pct = last ? Math.round(last.g / 6236 * 100) : 0;
  main.replaceChildren(prayerCard(),
    h('section', { class: 'card' }, h('h2', {}, 'Lanjutkan Membaca'), last ? h('p', {}, `Terakhir: ${l[last.s - 1].englishName} ayat ${last.i}`) : h('p', { class: 'muted' }, 'Belum ada bacaan tersimpan.'),
      h('div', { class: 'bar' }, h('i', { style: `width:${pct}%` })), h('p', { class: 'muted' }, `Progres membaca: ${pct}% dari 6.236 ayat (berdasarkan ayat terakhir)`),
      h('a', { class: 'btn', href: last ? `#/surah/${last.s}/${last.i}` : '#/surah/1' }, 'Lanjutkan Membaca')),
    h('section', { class: 'card' }, h('h2', {}, 'Surah Pilihan'), h('div', { class: 'chips' }, [1, 18, 36, 55, 67, 112].map(n => h('a', { class: 'chip', href: '#/surah/' + n }, l[n - 1].englishName)), h('a', { class: 'chip', href: '#/quran' }, 'Semua surah →'))));
  main.append(await ayCard(AY[Math.floor(Date.now() / 864e5) % AY.length])); paint()
}
async function quran() {
  const l = await surahList(), q = h('input', { id: 'q', type: 'search', 'aria-label': 'Cari surah atau ayat', placeholder: 'Nama surah, nomor (mis. 2:255), atau kata dalam terjemahan' }),
  f = h('select', { 'aria-label': 'Filter kategori' }, h('option', { value: '' }, 'Semua'), h('option', { value: 'Meccan' }, 'Makkiyah'), h('option', { value: 'Medinan' }, 'Madaniyah')), list = h('div', {}), res = h('div', {});
  const draw = () => { const k = q.value.trim().toLowerCase(); list.replaceChildren(...l.filter(m => (!f.value || m.revelationType === f.value) && (!k || [m.englishName, m.englishNameTranslation, m.name, String(m.number)].some(x => x.toLowerCase().includes(k)))).map(sRow)) };
  const deep = async () => {
    const v = q.value.trim(), m = /^(\d{1,3})\s*[:.]\s*(\d{1,3})$/.exec(v); if (m && m[1] >= 1 && m[1] <= 114) { location.hash = `#/surah/${m[1]}/${m[2]}`; return } if (v.length < 3) { res.replaceChildren(h('p', { class: 'muted' }, 'Ketik minimal 3 huruf.')); return }
    res.replaceChildren(h('p', { class: 'muted' }, 'Mencari…')); try { const r = await search(v); res.replaceChildren(h('h3', {}, `Hasil terjemahan (${r.length})`), ...r.slice(0, 30).map(x => h('a', { class: 'card', style: 'display:block;text-decoration:none;color:inherit', href: `#/surah/${x.surah.number}/${x.numberInSurah}` }, h('b', {}, `${x.surah.englishName} : ${x.numberInSurah}`), h('p', {}, x.text)))) } catch (e) { res.replaceChildren(h('p', { class: 'err' }, 'Pencarian gagal: ' + e.message)) }
  };
  q.addEventListener('input', draw); q.addEventListener('keydown', e => e.key === 'Enter' && deep()); f.addEventListener('change', draw);
  const bm = store.get('bm', []);
  main.replaceChildren(h('div', { class: 'card' }, h('h2', {}, 'Al-Qur’an — 114 Surah'), h('div', { class: 'chips' }, q, f, h('button', { class: 'pri', onclick: deep }, 'Cari ayat')), res),
    bm.length ? h('div', { class: 'card' }, h('h3', {}, 'Bookmark'), h('div', { class: 'chips' }, bm.map(b => h('span', { class: 'chip' }, h('a', { href: `#/surah/${b.s}/${b.i}` }, `${l[b.s - 1].englishName}:${b.i}`), ' ', h('button', { 'aria-label': 'Hapus bookmark', onclick: () => { if (confirm('Hapus bookmark ini?')) { store.set('bm', bm.filter(x => x.g !== b.g)); quran() } } }, '✕'))))) : null, list); draw()
}
async function reader(n, a) {
  if (!(n >= 1 && n <= 114)) { main.replaceChildren(h('p', {}, 'Surah tidak valid.')); return }
  const [l, s, fat] = await Promise.all([surahList(), surah(n, set.qari), surah(1, set.qari)]), m = l[n - 1]; cs = n; ays = s.ayahs;
  let bm = store.get('bm', []);
  const rows = s.ayahs.map(y => {
    const txt = y.i === 1 && n !== 1 && n !== 9 ? y.ar.split(' ').slice(4).join(' ') : y.ar;
    const b = h('button', { 'aria-label': 'Bookmark ayat ' + y.i, onclick: () => { bm = store.get('bm', []); const has = bm.some(x => x.g === y.g); bm = has ? bm.filter(x => x.g !== y.g) : [...bm, { s: n, i: y.i, g: y.g }]; store.set('bm', bm); b.textContent = has ? '☆' : '★' } }, bm.some(x => x.g === y.g) ? '★' : '☆');
    return h('div', { class: 'ay', id: 'a' + y.i, 'data-i': y.i }, h('div', { class: 'row' }, h('b', {}, `${n}:${y.i}`), h('button', { 'aria-label': 'Putar ayat ' + y.i, onclick: () => { single = true; playIdx(y.i - 1) } }, '▶'), b), h('div', { class: 'ar', lang: 'ar' }, txt), h('p', { class: 'tr' }, y.id))
  });
  const sel = (v, opts, fn, lab) => h('select', { 'aria-label': lab, onchange: e => fn(e.target.value) }, opts.map(([k, t]) => h('option', { value: k, selected: String(k) === String(v) }, t)));
  const pp = h('button', { class: 'pri', 'aria-label': 'Putar atau jeda', onclick: () => { if (idx < 0) { single = false; playIdx(a > 0 ? a - 1 : 0) } else A.paused ? A.play() : A.pause() } }, '▶/⏸');
  const bar = h('div', { class: 'abar' }, pp, h('button', { 'aria-label': 'Ayat sebelumnya', onclick: () => playIdx(idx < 0 ? 0 : idx - 1) }, '⏮'), h('button', { 'aria-label': 'Ayat berikutnya', onclick: () => playIdx(idx + 1) }, '⏭'), h('button', { 'aria-label': 'Berhenti', onclick: stopAudio }, '⏹'),
    h('label', {}, h('input', { type: 'checkbox', onchange: e => single = e.target.checked }), ' satu ayat'),
    sel(set.rate, [[.75, '0.75×'], [1, '1×'], [1.25, '1.25×'], [1.5, '1.5×']], v => { set.rate = +v; save(); A.playbackRate = set.rate }, 'Kecepatan'),
    h('input', { type: 'range', min: 0, max: 1, step: .1, value: set.vol, 'aria-label': 'Volume', onchange: e => { set.vol = +e.target.value; save(); A.volume = set.vol } }));
  const ctl = (lab, k, min, max, st) => h('label', { class: 'f' }, lab, h('input', { type: 'range', min, max, step: st, value: set[k], oninput: e => { set[k] = +e.target.value; save() } }));
  main.replaceChildren(h('div', { class: 'card' }, h('h1', {}, `${m.englishName} · ${m.name}`), h('p', { class: 'muted' }, `${m.englishNameTranslation} · ${m.numberOfAyahs} ayat · ${m.revelationType === 'Meccan' ? 'Makkiyah' : 'Madaniyah'}`),
    h('details', {}, h('summary', {}, 'Tampilan teks'), ctl('Ukuran Arab', 'arSize', 22, 60, 2), ctl('Ukuran terjemahan', 'trSize', 12, 28, 1), ctl('Jarak baris', 'lh', 1.5, 3.2, .1)),
    h('div', { class: 'chips' }, n > 1 ? h('a', { class: 'btn', href: '#/surah/' + (n - 1) }, '← Surah sebelumnya') : null, n < 114 ? h('a', { class: 'btn', href: '#/surah/' + (n + 1) }, 'Surah berikutnya →') : null)),
    n !== 1 && n !== 9 ? h('div', { class: 'ar bsm', lang: 'ar' }, fat.ayahs[0].ar) : null, ...rows, bar);
  if (a > 0) $('#a' + a)?.scrollIntoView({ block: 'center' });
  const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting && idx < 0) { const y = ays[+e.target.dataset.i - 1]; saveLast(y) } }, { rootMargin: '-20% 0px -70% 0px' }); $$('.ay').forEach(x => io.observe(x))
}
const DOA = [['2:201', 'Doa kebaikan dunia dan akhirat'], ['20:114', 'Doa memohon tambahan ilmu'], ['17:24', 'Doa untuk kedua orang tua'], ['14:41', 'Doa ampunan bagi orang tua dan kaum mukmin'], ['25:74', 'Doa untuk pasangan dan keturunan'], ['3:8', 'Doa memohon keteguhan hati']];
async function doa() {
  main.replaceChildren(h('div', { class: 'card' }, h('h2', {}, 'Doa dari Al-Qur’an'), h('p', { class: 'muted' }, 'Teks Arab dan terjemahan diambil langsung dari API Al-Qur’an. Transliterasi tidak tersedia dari sumber ini. Doa harian dari hadis (makan, tidur, dll.) belum disertakan karena butuh dataset hadis berverifikasi.')));
  for (const [r, t] of DOA) main.append(await ayCard(r, t))
}
function setelan() {
  const row = (lab, el) => h('label', { class: 'f' }, lab, el), sel = (k, opts, after) => h('select', { onchange: e => { set[k] = isNaN(e.target.value) ? e.target.value : +e.target.value; save(); after?.() } }, opts.map(([v, t]) => h('option', { value: v, selected: String(v) === String(set[k]) }, t)));
  const rl = () => loadDays().then(paint);
  const nf = h('input', { type: 'checkbox', checked: set.notif, onchange: async e => { set.notif = e.target.checked; if (set.notif && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); if (set.notif && Notification.permission === 'denied') toast('Izin notifikasi diblokir; notifikasi dalam halaman tetap aktif.'); save() } });
  const sd = h('input', { type: 'checkbox', checked: set.sound, onchange: e => { set.sound = e.target.checked; ac = ac || new AudioContext(); save() } });
  main.replaceChildren(locPicker(), h('div', { class: 'card' }, h('h2', {}, 'Pengaturan'),
    row('Metode perhitungan', sel('method', [[20, 'Kemenag RI'], [3, 'Muslim World League'], [4, 'Umm al-Qura'], [2, 'ISNA'], [5, 'Egyptian'], [1, 'Karachi']], rl)),
    row('Mazhab Asar', sel('school', [[0, 'Syafi’i/Maliki/Hanbali'], [1, 'Hanafi']], rl)),
    row('Qari', sel('qari', [['ar.alafasy', 'Mishary Alafasy'], ['ar.husary', 'Mahmoud Khalil Al-Husary'], ['ar.minshawi', 'Al-Minshawi'], ['ar.abdulbasitmurattal', 'Abdul Basit']])),
    row('Mode', sel('theme', [['light', 'Terang'], ['dark', 'Gelap']])), row('Notifikasi waktu salat', nf), row('Suara pengingat', sd),
    h('p', { class: 'muted' }, 'Notifikasi browser memerlukan izin dan dapat dibatasi OS/browser. Notifikasi hanya muncul saat halaman ini terbuka; tanpa backend push, tab yang tertutup tidak dapat diberi notifikasi tepat waktu.'),
    h('div', { class: 'chips' }, h('button', { onclick: () => { ac = ac || new AudioContext(); toast('Uji notifikasi: waktu salat telah tiba'); beep(); if ('Notification' in window && Notification.permission === 'granted') new Notification('NurQur’an', { body: 'Uji notifikasi' }) } }, 'Uji notifikasi & suara'),
      h('button', { onclick: () => { if (confirm('Reset semua pengaturan?')) { store.del('set'); location.reload() } } }, 'Reset pengaturan'),
      h('button', { onclick: () => { if (confirm('Hapus bookmark dan progres membaca?')) { store.del('bm'); store.del('last'); toast('Data bacaan dihapus') } } }, 'Reset bookmark & progres'))));
}
async function jadwal() {
  const nav = h('div', { class: 'card' }, h('h3', {}, 'Mode simulasi (uji lokal)'), h('p', { class: 'muted' }, 'Menjalankan jadwal contoh berlabel SIMULASI (salat tiap 12 detik, lalu Subuh hari berikutnya). Tidak mengubah jadwal asli.'),
    h('div', { class: 'chips' }, h('button', { class: 'pri', onclick: startSim }, 'Mulai simulasi'), h('button', { onclick: () => { sim = null; lastId = undefined; paint() } }, 'Hentikan simulasi'), h('button', { onclick: () => loadDays().then(paint) }, 'Muat ulang jadwal')));
  main.replaceChildren(prayerCard(), locPicker(), nav); paint()
}
const routes = { '': home, quran, surah: null, jadwal, doa, setelan };
async function route() {
  stopAudio(); const [, p = '', a, b] = location.hash.split('/'); cs = 0;
  $$('nav a').forEach(x => x.setAttribute('aria-current', x.getAttribute('href') === '#/' + (p === 'surah' ? 'quran' : p) ? 'page' : 'false')); loading();
  try { if (p === 'surah') await reader(+a, +b || 0); else await (routes[p] || home)(); paint(); window.scrollTo(0, 0) } catch (e) { main.replaceChildren(h('div', { class: 'card' }, h('p', { class: 'err' }, 'Terjadi kesalahan: ' + e.message), h('button', { onclick: route }, 'Coba lagi'))) }
}
$('#theme').onclick = () => { set.theme = set.theme === 'dark' ? 'light' : 'dark'; save() };
$('#sbtn').onclick = () => { location.hash = '#/quran'; setTimeout(() => $('#q')?.focus(), 300) };
addEventListener('hashchange', route);
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('service-worker.js').catch(() => { });
loadDays().then(() => { paint(); route() }); route();
