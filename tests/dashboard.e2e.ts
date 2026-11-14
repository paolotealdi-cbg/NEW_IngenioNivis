import { test, expect, type Page } from '@playwright/test';
import { NOW, HOUR, stationPayload, forecastPayload } from './fixtures';

async function prepare(page: Page, options: { station?: unknown; fail?: boolean; cache?: unknown; partial?: boolean; delay?: number } = {}) {
  await page.clock.install({ time: NOW });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/station') {
      if (options.delay) await new Promise(resolve => setTimeout(resolve,options.delay));
      if (options.fail) return route.fulfill({ status:503, json:{error:true} });
      return route.fulfill({ json: options.station ?? stationPayload() });
    }
    if (url.hostname === 'api.open-meteo.com') {
      if (url.searchParams.has('daily')) return route.fulfill({json:{daily:{sunrise:[NOW/1000-5*HOUR/1000],sunset:[NOW/1000+HOUR/1000]}}});
      const data=forecastPayload(NOW,-15); // Deliberately includes midnight to catch old slice(0,12).
      if(options.partial) data.hourly.snowfall_meteoswiss_icon_ch1[17]=null;
      return route.fulfill({json:data});
    }
    if (url.hostname === '127.0.0.1') return route.continue();
    return route.abort(); // No external webcams, map tiles or real authenticated calls.
  });
  if(options.cache) await page.addInitScript(({raw,now})=>localStorage.setItem('ingenio.station.v2',JSON.stringify({version:2,raw,downloadedAt:now-11*60_000})),{raw:options.cache,now:NOW});
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Connessione in corso...'})).toHaveCount(0);
}
const errors = (page: Page) => { const values:string[]=[];page.on('pageerror',e=>values.push(e.message));return values; };

test('desktop: recent measurements, verified API and correct current-hour window in foreign timezone',async({page})=>{
  const failures=errors(page);await prepare(page);
  await expect(page.locator('header')).toContainText('Dati recenti');
  await expect(page.locator('header')).toContainText('Ultimo accesso API riuscito');
  await expect(page.locator('header')).toContainText('17:18');
  const forecast=page.locator('table').filter({has:page.getByRole('columnheader',{name:'Condizione (WMO)'})});
  await expect(forecast.locator('tbody tr')).toHaveCount(24);
  await expect(forecast.locator('tbody tr').first()).toContainText('17:00');
  expect(failures).toEqual([]);
});
test('reachable API with old measurements is not declared safe',async({page})=>{
  await prepare(page,{station:stationPayload(NOW-40*60_000)});
  await expect(page.locator('header')).toContainText('Dati vecchi');
  await expect(page.locator('header')).toContainText('Ultimo accesso API riuscito');
  await expect(page.getByRole('heading',{name:'AUTOMAZIONE NON VALUTABILE'})).toBeVisible();
});
test('failed acquisition with recent cached measurement preserves freshness and reports API failure',async({page})=>{
  await prepare(page,{fail:true,cache:stationPayload(NOW-15*60_000)});
  await expect(page.locator('header')).toContainText('Dati recenti');
  await expect(page.locator('header')).toContainText('Ultimo accesso API fallito');
  await expect(page.locator('header')).toContainText('CACHE');
});
test('failed API without cache leaves absent data and working manual demonstration',async({page})=>{
  const failures=errors(page);await prepare(page,{fail:true});
  await expect(page.locator('header')).toContainText('Dati assenti');
  await expect(page.locator('header')).toContainText('Ultimo accesso API fallito');
  await expect(page.locator('header')).toContainText('Ultimo tentativo: 22/10');
  await expect(page.getByRole('heading',{name:'AUTOMAZIONE NON VALUTABILE'})).toBeVisible();
  await page.getByRole('button',{name:'FORCE ON',exact:true}).click();
  await expect(page.getByRole('heading',{name:/RISCALDAMENTO ATTIVO/})).toBeVisible();
  await page.getByRole('button',{name:'Ripristina Auto',exact:true}).click();
  await expect(page.getByRole('heading',{name:'AUTOMAZIONE NON VALUTABILE'})).toBeVisible();
  expect(failures).toEqual([]);
});
test('missing forecast values render N/D and do not activate automatic SAFE',async({page})=>{
  const failures=errors(page);await prepare(page,{partial:true});
  await expect(page.getByRole('heading',{name:'AUTOMAZIONE NON VALUTABILE'})).toBeVisible();
  const forecast=page.locator('table').filter({has:page.getByRole('columnheader',{name:'Condizione (WMO)'})});
  await expect(forecast.locator('tbody tr').nth(2)).toContainText('N/D');expect(failures).toEqual([]);
});
test('missing temperature is displayed, not converted to 0 degrees',async({page})=>{
  await prepare(page,{station:stationPayload(NOW-300_000,{temp_med:null})});
  await expect(page.locator('header')).toContainText('Campi assenti: temp_med');
  await expect(page.getByText('N/D°C',{exact:true}).first()).toBeVisible();
  await expect(page.getByRole('heading',{name:'AUTOMAZIONE NON VALUTABILE'})).toBeVisible();
});
test('clock aging and next-hour transition update UI without reloading the page',async({page})=>{
  await prepare(page);
  await page.clock.fastForward(31*60_000);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('header')).toContainText('Dati vecchi');
  await page.clock.fastForward(22*60_000);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  const forecast=page.locator('table').filter({has:page.getByRole('columnheader',{name:'Condizione (WMO)'})});
  await expect(forecast.locator('tbody tr').first()).toContainText('18:00');
});
test('switching scenarios labels demo and restores real data without browser exceptions',async({page})=>{
  const failures=errors(page);await prepare(page);
  for(const scenario of ['SNOW_STORM','FREEZING_RAIN','CLEAR_COLD','HEATING_CYCLE_TEST']) {
    await page.locator('select').selectOption(scenario);
    await expect(page.locator('header')).toContainText('SIMULAZIONE');
    await expect(page.getByRole('heading',{name:'Connessione in corso...'})).toHaveCount(0);
  }
  await page.locator('select').selectOption('REAL');
  await expect(page.locator('header')).toContainText('Dati recenti');
  expect(failures).toEqual([]);
});
test('mobile viewport renders quality and forecasts without runtime exceptions',async({page})=>{
  await page.setViewportSize({width:375,height:812});const failures=errors(page);await prepare(page);
  await expect(page.locator('header')).toContainText('Dati recenti');
  await expect(page.getByRole('heading',{name:/Dettaglio Orario/})).toBeVisible();
  expect(failures).toEqual([]);
});
test('production server missing secret returns structured 503, never HTML or embedded credentials',async({request})=>{
  const response=await request.get('/api/station');expect(response.status()).toBe(503);
  expect(await response.json()).toEqual({error:true,message:'Chiave API stazione non configurata.'});
});

test('late real request cannot overwrite a selected demo',async({page})=>{
  const preparing=prepare(page,{delay:1000});
  await page.waitForSelector('select');
  await page.locator('select').selectOption('SNOW_STORM');
  await preparing;
  await expect(page.locator('header')).toContainText('SIMULAZIONE');
  await page.waitForTimeout(1100);
  await expect(page.locator('header')).toContainText('SIMULAZIONE');
});
