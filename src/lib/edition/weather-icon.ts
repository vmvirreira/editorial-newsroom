export function weatherIconKind(forecast: string) {
  const text = forecast.toLowerCase();
  if (/thunder|storm/.test(text)) return 'storm';
  if (/snow|sleet|ice|freezing|wintry/.test(text)) return 'snow';
  if (/rain|shower|drizzle/.test(text)) return 'rain';
  if (/fog|haze|mist|smoke/.test(text)) return 'fog';
  if (/partly|mostly sunny|mostly clear/.test(text)) return 'partly';
  if (/cloud|overcast/.test(text)) return 'cloud';
  if (/sunny|clear/.test(text)) return 'sun';
  return 'unknown';
}
