const fallbackTripTimezone = "Asia/Shanghai";

export const commonTripTimezones = [
  "Asia/Shanghai",
  "Asia/Kuala_Lumpur",
  "Asia/Tokyo",
  "Asia/Bangkok",
  "Asia/Seoul",
  "Asia/Singapore",
  "Australia/Sydney",
  "Europe/London",
  "America/Los_Angeles",
  "America/New_York",
  "UTC"
];

const timezoneHints: Array<{
  timezone: string;
  keywords: string[];
}> = [
  {
    timezone: "Asia/Kuala_Lumpur",
    keywords: [
      "马来西亚",
      "malaysia",
      "吉隆坡",
      "kuala lumpur",
      "槟城",
      "penang",
      "乔治市",
      "george town",
      "亚庇",
      "哥打京那巴鲁",
      "kota kinabalu",
      "沙巴",
      "sabah"
    ]
  },
  {
    timezone: "Asia/Tokyo",
    keywords: ["日本", "japan", "东京", "tokyo", "大阪", "osaka", "京都", "kyoto"]
  },
  {
    timezone: "Asia/Bangkok",
    keywords: ["泰国", "thailand", "曼谷", "bangkok", "清迈", "chiang mai"]
  },
  {
    timezone: "Asia/Seoul",
    keywords: ["韩国", "korea", "首尔", "seoul", "釜山", "busan"]
  },
  {
    timezone: "Asia/Singapore",
    keywords: ["新加坡", "singapore"]
  },
  {
    timezone: "Asia/Shanghai",
    keywords: [
      "中国",
      "中国大陆",
      "china",
      "北京",
      "上海",
      "广州",
      "深圳",
      "杭州",
      "成都",
      "重庆",
      "西安",
      "厦门",
      "香港",
      "澳门"
    ]
  }
];

export function parseTripDestinations(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[，,、/\n]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function isValidTripTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return Boolean(value.trim());
  } catch {
    return false;
  }
}

export function browserTimezone() {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return detected && isValidTripTimezone(detected)
    ? detected
    : fallbackTripTimezone;
}

export function inferTripTimezone(destinations: string[], fallback = browserTimezone()) {
  const text = destinations.join(" ").trim().toLowerCase();

  for (const hint of timezoneHints) {
    if (hint.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return hint.timezone;
    }
  }

  return isValidTripTimezone(fallback) ? fallback : fallbackTripTimezone;
}
