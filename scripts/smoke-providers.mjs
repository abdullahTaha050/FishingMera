const latitude = 41.1;
const longitude = 30.7;
const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=wind_speed_10m,wind_gusts_10m&daily=sunrise,sunset&timezone=UTC&forecast_days=1`;
const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height,wave_period,sea_surface_temperature&timezone=UTC&forecast_days=1&cell_selection=sea`;

const [weather, marine] = await Promise.all([fetch(weatherUrl, { signal: AbortSignal.timeout(12_000) }), fetch(marineUrl, { signal: AbortSignal.timeout(12_000) })]);
if (!weather.ok) throw new Error(`WEATHER_HTTP_${weather.status}`);
if (!marine.ok) throw new Error(`MARINE_HTTP_${marine.status}`);
const [weatherBody, marineBody] = await Promise.all([weather.json(), marine.json()]);
if (!Array.isArray(weatherBody.hourly?.wind_speed_10m) || !weatherBody.daily?.sunrise?.[0]) throw new Error("WEATHER_SCHEMA_INVALID");
if (!Array.isArray(marineBody.hourly?.wave_height) || !Array.isArray(marineBody.hourly?.wave_period)) throw new Error("MARINE_SCHEMA_INVALID");
console.log("Open-Meteo weather and marine smoke test passed.");
