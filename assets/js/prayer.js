export const NAMES = { Imsak: 'Imsak', Fajr: 'Subuh', Sunrise: 'Syuruq', Dhuhr: 'Zuhur', Asr: 'Asar', Maghrib: 'Magrib', Isha: 'Isya' };
export const MAIN = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
export const tzFmt = (ts, tz, o) => new Intl.DateTimeFormat('id-ID', { timeZone: tz, hourCycle: 'h23', ...o }).format(ts);
const parts = (ts, tz) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(ts).map(x => [x.type, +x.value]));
export const ymdOf = (ts, tz) => { const p = parts(ts, tz); return [p.year, p.month, p.day] };
export const addDay = ([y, m, d], n) => { const x = new Date(Date.UTC(y, m - 1, d + n)); return [x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()] };
// jam dinding (y,m,d,h,mi) di zona tz -> epoch ms
export const zoned = (y, m, d, h, mi, tz) => { const g = Date.UTC(y, m - 1, d, h, mi), p = parts(g, tz); return g - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - g) };
export const entriesFor = (ymd, d) => MAIN.map(k => ({ id: ymd.join('-') + k, k, name: NAMES[k], ts: zoned(...ymd, ...d.t[k], d.tz) }));
export const state = (E, now) => ({ cur: E.filter(e => e.ts <= now).pop() || null, next: E.find(e => e.ts > now) || null });
export const fmtCD = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), p = n => String(n).padStart(2, '0'); return `${p(s / 3600 | 0)}:${p(s % 3600 / 60 | 0)}:${p(s % 60)}` };
