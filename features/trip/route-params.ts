export function decodeRouteParam(value: string) {
  let current = value.trim();

  for (let index = 0; index < 2; index += 1) {
    try {
      const decoded = decodeURIComponent(current);

      if (decoded === current) {
        break;
      }

      current = decoded;
    } catch {
      break;
    }
  }

  return current;
}
