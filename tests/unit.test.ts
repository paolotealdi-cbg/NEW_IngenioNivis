import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { parseMeasurement, parseStationTimestamp, classifyFreshness, stationFreshness, formatRomeTime, formatMeasurement } from '../services/dataQuality';
import { getForecastWindow } from '../services/forecastWindow';
import { normalizeForecast, normalizeStationData, fetchStationData, fetchForecast, resetStationSessionForTests, STATION_CACHE_KEY, analyzeRisk } from '../services/weatherService';
import { evaluateAutomatic } from '../services/evaluateSystem';
import { AlertLevel } from '../types';
import { NOW, HOUR, stationPayload, forecastPayload, normalizedForecast } from './fixtures';
const realFetch = globalThis.fetch, realNow = Date.now;
const memory = new Map<string, string>();
const storage = { getItem: (k:string) => memory.get(k) ?? null, setItem: (k:string,v:string) => memory.set(k,v), removeItem: (k:string) => memory.delete(k) };
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
beforeEach(() => { memory.clear(); Date.now = () => NOW; resetStationSessionForTests(); });
afterEach(() => { globalThis.fetch = realFetch; Date.now = realNow; });
const json = (data: unknown) => new Response(JSON.stringify(data), {headers: {'content-type':'application/json'}});
const seedCache = (raw = stationPayload(), age = 2 * 60_000) => memory.set(STATION_CACHE_KEY, JSON.stringify({version:2,raw,downloadedAt:NOW-age}));
const failed = () => { globalThis.fetch = async () => { throw new TypeError('Network failure (test)'); }; };
const station = () => ({ ...normalizeStationData(stationPayload()), meta: { source: 'NETWORK' as const, observedAt: NOW - 300_000, downloadedAt: NOW, lastAttemptAt: NOW, lastSuccessAt: NOW, connection:'OK' as const, missingFields:[], error:null }});

for (const [value, expected] of [[0,0],['0',0],['-1,5',-1.5],['',null],[null,null],['N/D',null],['errore 12',null],['12 km/h',null],[NaN,null],[Infinity,null],['2.3',2.3]] as const) {
  test(`measurement ${String(value)} => ${expected}`, () => assert.equal(parseMeasurement(value), expected));
}
test('timestamps Unix seconds, milliseconds and explicit offsets agree', () => {
  assert.equal(parseStationTimestamp(NOW/1000), NOW); assert.equal(parseStationTimestamp(NOW), NOW);
  assert.equal(parseStationTimestamp('2026-10-22T17:23:00+02:00'), NOW);
});
test('local Italian timestamp is interpreted in Rome, not browser timezone', () => {
  assert.equal(parseStationTimestamp('22/10/2026 17:23'), NOW);
  assert.equal(parseStationTimestamp('2026-10-22 17:23:00'), NOW);
});
test('reject ambiguous and nonexistent DST local timestamps', () => {
  assert.equal(parseStationTimestamp('25/10/2026 02:30'), null);
  assert.equal(parseStationTimestamp('29/03/2026 02:30'), null);
});
test('reject invalid date and empty timestamp', () => {
  for (const value of ['31/02/2026 12:00', '', null, '17:23']) assert.equal(parseStationTimestamp(value), null);
});
for (const [age, state] of [[0,'FRESH'],[20*60_000,'FRESH'],[20*60_000+1,'OLD'],[60*60_000,'OLD'],[60*60_000+1,'EXPIRED'],[-180_000,'UNKNOWN']] as const) {
  test(`freshness boundary age ${age}`, () => assert.equal(classifyFreshness(true,NOW-age,NOW),state));
}
test('absent is distinct from unknown timestamp', () => {
  assert.equal(classifyFreshness(false,null,NOW),'ABSENT'); assert.equal(classifyFreshness(true,null,NOW),'UNKNOWN');
});
test('Rome display independent of host timezone and distinguishes repeated DST hour', () => {
  assert.match(formatRomeTime(NOW),/17:23/);
  assert.notEqual(formatRomeTime('2026-10-25T00:00:00Z'),formatRomeTime('2026-10-25T01:00:00Z'));
  assert.equal(formatMeasurement(null),'N/D'); assert.equal(formatMeasurement(0),'0.0');
});
test('window starts at current hour, not midnight; all series share the same index', () => {
  const f = normalizedForecast(NOW,-15); f.hourly.temperature_2m = f.hourly.time.map((_,i)=>i);
  const window = getForecastWindow(f,12,NOW)!;
  assert.equal(window.hourly.time[0],'2026-10-22T15:00:00.000Z');
  assert.equal(window.hourly.temperature_2m[0],15); assert.equal(window.hourly.time.length,12);
});
test('window advances without new downloads', () => {
  const f = normalizedForecast(); assert.equal(getForecastWindow(f,12,NOW+HOUR)!.hourly.time[0],f.hourly.time[1]);
});
test('window refuses missing, duplicate, insufficient or expired time coverage', () => {
  for (const kind of ['gap','duplicate','short','old']) {
    const f=normalizedForecast();
    if(kind==='gap') f.hourly.time[4] = f.hourly.time[5];
    if(kind==='duplicate') f.hourly.time[4] = f.hourly.time[3];
    if(kind==='short') f.hourly.time=f.hourly.time.slice(0,11);
    assert.equal(getForecastWindow(f,12,kind==='old'?NOW+49*HOUR:NOW),null);
  }
});
test('window preserves null and pads short measurement arrays with null', () => {
  const f=normalizedForecast(); f.hourly.snowfall=[null,0];
  assert.deepEqual(getForecastWindow(f,12)!.hourly.snowfall,[null,0,...Array(10).fill(null)]);
});
for (const iso of ['2026-10-25T00:30:00Z','2026-03-29T00:30:00Z','2026-10-22T21:30:00Z']) {
  test(`UTC window continuous across DST/midnight ${iso}`, () => {
    const now=Date.parse(iso); const w=getForecastWindow(normalizedForecast(now),24,now)!;
    assert.equal(w.hourly.time.length,24); assert.equal(Date.parse(w.hourly.time[23])-Date.parse(w.hourly.time[0]),23*HOUR);
  });
}
test('normalize CH1 fallback CH2 per value, preserving real zero', () => {
  const raw=forecastPayload(); raw.hourly.snowfall_meteoswiss_icon_ch1=[0,null,NaN] as any;
  (raw.hourly as any).snowfall_meteoswiss_icon_ch2=[9,2,null];
  assert.deepEqual(normalizeForecast(raw).hourly.snowfall.slice(0,4),[0,2,null,null]);
});
test('missing forecast fields are null, malformed time is rejected', () => {
  const raw=forecastPayload(); delete (raw.hourly as any).rain_meteoswiss_icon_ch1;
  assert.equal(normalizeForecast(raw).hourly.precipitation[0],null);
  assert.throws(()=>normalizeForecast({hourly:{time:['2026-10-22T00:00']}}));
});
test('station missing fields and history remain N/D/null rather than zero', () => {
  const raw=stationPayload(NOW,{temp_med:null,rh:'N/D',prp:'0'});
  raw.array_misure_24h[0][5]='N/D';
  const data=normalizeStationData(raw);
  assert.equal(data.temp_med,'N/D'); assert.equal(data.hum_med,'N/D'); assert.equal(data.rain_rate,'0');
  assert.equal(data.history[0].temp,null);
});
test('station invalid envelope is rejected', () => {
  for (const raw of [null,{error:true},{},{result_misure:{irrelevant:5}}]) assert.throws(()=>normalizeStationData(raw));
});
test('network success stores observation and download times separately', async () => {
  globalThis.fetch=async()=>json(stationPayload()); const data=await fetchStationData();
  assert.equal(data.meta!.source,'NETWORK'); assert.equal(data.meta!.connection,'OK');
  assert.equal(data.meta!.observedAt,NOW-300_000); assert.equal(data.meta!.downloadedAt,NOW);
});
test('network success can contain old data', async () => {
  globalThis.fetch=async()=>json(stationPayload(NOW-40*60_000)); const data=await fetchStationData();
  assert.equal(data.meta!.connection,'OK'); assert.equal(stationFreshness(data),'OLD');
});
test('cache hit after page restart does not invent connection success', async () => {
  seedCache(); let calls=0; globalThis.fetch=async()=>{calls++;return json(stationPayload());};
  const data=await fetchStationData(); assert.equal(calls,0); assert.equal(data.meta!.connection,'UNKNOWN');
  assert.equal(data.meta!.source,'CACHE'); assert.equal(data.meta!.downloadedAt,NOW-120_000);
});
test('network failure retains original cached dates and sets connection ERROR', async () => {
  seedCache(stationPayload(NOW-18*60_000),11*60_000); failed(); const data=await fetchStationData();
  assert.equal(data.meta!.connection,'ERROR'); assert.equal(data.meta!.observedAt,NOW-18*60_000);
  assert.equal(data.meta!.downloadedAt,NOW-11*60_000); assert.equal(stationFreshness(data),'FRESH');
});
test('network failure with expired cached measure stays expired', async () => {
  seedCache(stationPayload(NOW-2*HOUR),30*60_000); failed(); const data=await fetchStationData();
  assert.equal(stationFreshness(data),'EXPIRED'); assert.equal(data.meta!.connection,'ERROR');
});
test('network failure without cache rejects rather than zero-filling', async () => {
  failed(); await assert.rejects(fetchStationData(),/Network failure/);
});
test('invalid API response cannot poison valid cache', async () => {
  seedCache(stationPayload(),11*60_000); const before=memory.get(STATION_CACHE_KEY);
  globalThis.fetch=async()=>json({error:true}); const data=await fetchStationData();
  assert.equal(data.meta!.connection,'ERROR'); assert.equal(memory.get(STATION_CACHE_KEY),before);
});
test('HTTP 200 HTML is not a healthy API response', async () => {
  globalThis.fetch=async()=>new Response('<html/>',{headers:{'content-type':'text/html'}});
  await assert.rejects(fetchStationData(),/non JSON/);
});
test('unavailable localStorage does not break successful acquisition', async () => {
  Object.defineProperty(globalThis,'localStorage',{get(){throw new Error('storage blocked');},configurable:true});
  try { globalThis.fetch=async()=>json(stationPayload()); assert.equal((await fetchStationData()).meta!.connection,'OK'); }
  finally { Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true}); }
});
test('manual force bypasses fresh cache', async () => {
  seedCache(); let calls=0; globalThis.fetch=async()=>{calls++;return json(stationPayload());};
  await fetchStationData('REAL',true); assert.equal(calls,1);
});
test('parallel station requests are deduplicated', async () => {
  let calls=0; globalThis.fetch=async()=>{calls++;return json(stationPayload());};
  await Promise.all([fetchStationData(),fetchStationData()]); assert.equal(calls,1);
});
test('forecast requests use 48 hours Unix; astronomy failure is isolated', async () => {
  const urls:string[]=[]; globalThis.fetch=async(input)=>{
    const url=String(input); urls.push(url); if(url.includes('daily='))throw new Error('Astro test failure'); return json(forecastPayload());
  };
  const result=await fetchForecast(); const weatherUrl=urls.find(u=>u.includes('hourly='))!;
  assert.match(weatherUrl,/forecast_hours=48/); assert.match(weatherUrl,/timeformat=unixtime/);
  assert.doesNotMatch(weatherUrl,/forecast_days/); assert.equal(result.daily.sunrise.length,0);
});
test('critical forecast activates and predicted stop is after last hazard, not earlier clear hours', () => {
  const f=normalizedForecast(); f.hourly.weather_code[5]=73; f.hourly.snowfall[5]=1;
  const result=evaluateAutomatic(station(),f,NOW);
  assert.equal(result.heatingOn,true); assert.equal(result.evaluationAvailable,true);
  assert.equal(result.predictedShutOff,formatRomeTime(f.hourly.time[6]));
});
test('separated hazards do not produce shutdown between episodes', () => {
  const f=normalizedForecast(); f.hourly.weather_code[3]=73; f.hourly.weather_code[8]=73;
  assert.equal(evaluateAutomatic(station(),f).predictedShutOff,formatRomeTime(f.hourly.time[9]));
});
test('partial, old, absent or unknown data never yields SAFE', () => {
  const f=normalizedForecast(); const s=station();
  for (const invalid of [null,{...s,temp_med:'N/D'},{...s,meta:{...s.meta!,observedAt:null}},{...s,meta:{...s.meta!,observedAt:NOW-HOUR}}]) {
    const result=evaluateAutomatic(invalid,f); assert.equal(result.evaluationAvailable,false); assert.notEqual(result.alertLevel,AlertLevel.SAFE);
  }
  for (const key of ['snowfall','weather_code'] as const) { const broken=normalizedForecast();broken.hourly[key][4]=null; assert.equal(evaluateAutomatic(s,broken).evaluationAvailable,false); }
});
test('stale forecast and unknown WMO inhibit evaluation', () => {
  const f=normalizedForecast(); f.fetchedAt=NOW-HOUR; assert.equal(evaluateAutomatic(station(),f).evaluationAvailable,false);
  f.fetchedAt=NOW; f.hourly.weather_code[0]=999; assert.equal(evaluateAutomatic(station(),f).evaluationAvailable,false);
});
test('valid recent clear forecast retains original risk thresholds', () => {
  assert.equal(evaluateAutomatic(station(),normalizedForecast()).alertLevel,AlertLevel.SAFE);
  const s=station(); s.temp_med='0'; assert.equal(evaluateAutomatic(s,normalizedForecast()).alertLevel,AlertLevel.WARNING);
});
test('direct analysis refuses incomplete sequence', () => assert.equal(analyzeRisk(0,[0],[0],['2026-10-22T15:00:00Z']).evaluationAvailable,false));
for (const scenario of ['SNOW_STORM','FREEZING_RAIN','CLEAR_COLD','HEATING_CYCLE_TEST'] as const) {
  test(`demo ${scenario} rebases times and labels synthetic source`,async()=>{
    const s=await fetchStationData(scenario),f=await fetchForecast(scenario);
    assert.equal(s.meta!.source,'DEMO');assert.equal(f.isDemo,true);assert.ok(getForecastWindow(f,24));
    assert.equal(evaluateAutomatic(s,f).evaluationAvailable,true);
  });
}
test('unsupported cache formats are ignored rather than trusted', async () => {
  memory.set(STATION_CACHE_KEY,JSON.stringify({version:1,raw:stationPayload(),downloadedAt:NOW}));
  failed(); await assert.rejects(fetchStationData());
});
test('unknown station timestamp remains unknown despite a successful API call', async () => {
  globalThis.fetch=async()=>json(stationPayload(NOW,{ts:'17:23'}));
  const data=await fetchStationData(); assert.equal(stationFreshness(data),'UNKNOWN'); assert.equal(data.meta!.connection,'OK');
});
test('HTTP 503 is an API error even if browser has a network interface', async () => {
  globalThis.fetch=async()=>new Response('{}',{status:503,headers:{'content-type':'application/json'}});
  await assert.rejects(fetchStationData(),/HTTP 503/);
});
test('all-null station is absent, zero-valued measurements are available', async () => {
  globalThis.fetch=async()=>json(stationPayload(NOW,{temp_med:null,rh:null,wes_med:null,prp:null}));
  assert.equal(stationFreshness(await fetchStationData()),'ABSENT');resetStationSessionForTests();memory.clear();
  globalThis.fetch=async()=>json(stationPayload(NOW,{temp_med:'0',rh:'0',wes_med:'0',prp:'0'}));
  assert.equal(stationFreshness(await fetchStationData()),'FRESH');
});
test('cached forecast age is not reset by constructing a new window', () => {
  const f=normalizedForecast();f.fetchedAt=NOW-HOUR;
  assert.equal(getForecastWindow(f,24)?.fetchedAt,NOW-HOUR);
});
test('timeout is reported independently of cached measurement age', async () => {
  seedCache(stationPayload(),11*60_000);
  globalThis.fetch=async()=>{throw new DOMException('Test timeout','TimeoutError');};
  const data=await fetchStationData();assert.equal(data.meta!.connection,'ERROR');assert.match(data.meta!.error!,/timeout/);
});
test('malformed JSON and invalid cache fall back to actual network acquisition', async () => {
  memory.set(STATION_CACHE_KEY,'{invalid json');
  globalThis.fetch=async()=>json(stationPayload());assert.equal((await fetchStationData()).meta!.source,'NETWORK');
});
test('successful forced retry clears prior acquisition error', async () => {
  seedCache(stationPayload(),11*60_000);failed();assert.equal((await fetchStationData()).meta!.connection,'ERROR');
  globalThis.fetch=async()=>json(stationPayload());const recovered=await fetchStationData('REAL',true);
  assert.equal(recovered.meta!.connection,'OK');assert.equal(recovered.meta!.error,null);
});
test('negative snow falls back to CH2, never accepted as a real zero', () => {
  const raw=forecastPayload();raw.hourly.snowfall_meteoswiss_icon_ch1[0]=-1;
  (raw.hourly as any).snowfall_meteoswiss_icon_ch2=Array(48).fill(null);
  assert.equal(normalizeForecast(raw).hourly.snowfall[0],null);
});
test('station 10-minute cache tolerance refreshes despite prior HTTP latency', async () => {
  seedCache(stationPayload(), 10 * 60_000 - 5_000);
  let calls = 0;
  globalThis.fetch = async () => { calls++; return json(stationPayload()); };
  const data = await fetchStationData();
  assert.equal(calls, 1);
  assert.equal(data.meta!.source, 'NETWORK');
});
