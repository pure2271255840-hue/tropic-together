type CountdownState = {
  eyebrow: string;
  value: string;
  unit: string;
  description: string;
};

const dayMs = 1000 * 60 * 60 * 24;

export function getTripCountdown(
  startDate: string,
  endDate: string,
  now = new Date()
): CountdownState {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) {
    const days = Math.max(1, Math.ceil((start.getTime() - now.getTime()) / dayMs));

    return {
      eyebrow: "距离出发",
      value: String(days),
      unit: "天",
      description: "还有时间把地点、订单和任务慢慢收拢。"
    };
  }

  if (now <= end) {
    const dayNumber = Math.max(
      1,
      Math.ceil((now.getTime() - start.getTime() + 1) / dayMs)
    );

    return {
      eyebrow: "旅途中",
      value: `第 ${dayNumber}`,
      unit: "天",
      description: "优先查看今日集合时间、下一站和负责人。"
    };
  }

  return {
    eyebrow: "旅程回顾",
    value: "已完成",
    unit: "",
    description: "可以整理收藏地点和订单记录，留给下一次旅行。"
  };
}

export function getPriorityTone(priority: "高" | "中" | "低") {
  if (priority === "高") {
    return "coral";
  }

  if (priority === "中") {
    return "sunset";
  }

  return "teal";
}
