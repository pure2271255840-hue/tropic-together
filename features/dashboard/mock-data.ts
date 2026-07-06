import type { DashboardData, TripMember } from "./types";

const members: TripMember[] = [
  { name: "Noah", role: "路线负责人", avatar: "N" },
  { name: "Mia", role: "美食收藏", avatar: "M" },
  { name: "Yuki", role: "酒店与订单", avatar: "Y" },
  { name: "Leo", role: "交通衔接", avatar: "L" }
];

const dashboardData: DashboardData = {
  trip: {
    id: "penang-kota-kinabalu-2026",
    name: "槟城 × 哥打京那巴鲁",
    subtitle: "Shared plans, better trips.",
    dateRange: "2026 年 8 月 1 日 - 8 月 10 日",
    startDate: "2026-08-01T00:00:00+08:00",
    endDate: "2026-08-10T23:59:59+08:00",
    timezone: "Asia/Kuala_Lumpur",
    destinations: [
      { city: "槟城", mood: "壁画、咖啡、老城夜风", tone: "sunset" },
      { city: "乔治市", mood: "步行街区与娘惹小店", tone: "coral" },
      { city: "哥打京那巴鲁", mood: "海岛、日落、海鲜晚餐", tone: "teal" },
      { city: "沙巴海岛", mood: "跳岛与慢节奏海滩", tone: "leaf" }
    ],
    members
  },
  todayPlan: {
    dateLabel: "8 月 4 日 · 第 4 天",
    city: "槟城",
    theme: "老城早餐、壁画街区与码头日落",
    status: "待确认",
    meetingTime: "09:20",
    meetingPlace: "酒店大堂",
    nextActivity: "10:00 多春茶室早餐",
    owner: members[0],
    reminder: "Chew Jetty 傍晚光线更舒服，午后保留 40 分钟休息。"
  },
  upcomingTask: {
    id: "task-airport-transfer",
    title: "确认槟城机场到酒店接送",
    status: "进行中",
    owner: members[3],
    dueDate: "2026-07-18",
    dueLabel: "7 月 18 日前",
    priority: "高",
    relatedTo: "抵达日交通",
    note: "需要确认 4 人行李空间和夜间附加费。"
  },
  dueSoonTasks: [
    {
      id: "task-esim",
      title: "比较 eSIM 套餐",
      status: "等待决定",
      owner: members[1],
      dueDate: "2026-07-12",
      dueLabel: "7 月 12 日前",
      priority: "中",
      relatedTo: "全程网络",
      note: "优先看马来西亚 10 天流量包。"
    },
    {
      id: "task-hotel-kk",
      title: "锁定 KK 海边酒店",
      status: "未开始",
      owner: members[2],
      dueDate: "2026-07-15",
      dueLabel: "7 月 15 日前",
      priority: "高",
      relatedTo: "8 月 6 日 - 8 月 10 日",
      note: "需要靠近 Waterfront，方便晚餐和看日落。"
    }
  ],
  unassignedTasks: [],
  recentPlaces: [
    {
      id: "place-chew-jetty",
      name: "姓周桥 Chew Jetty",
      city: "槟城",
      category: "景点",
      status: "待确认",
      addedBy: members[0],
      voteSummary: "3 人想去",
      suggestedTime: "傍晚 17:30 后"
    },
    {
      id: "place-kek-lok-si",
      name: "极乐寺 Kek Lok Si",
      city: "槟城",
      category: "博物馆 / 文化",
      status: "尚未安排",
      addedBy: members[1],
      voteSummary: "2 人必去",
      suggestedTime: "上午，避开正午"
    },
    {
      id: "place-kk-waterfront",
      name: "KK Waterfront",
      city: "哥打京那巴鲁",
      category: "日落点",
      status: "备选",
      addedBy: members[3],
      voteSummary: "大家都可以",
      suggestedTime: "日落前 45 分钟"
    }
  ],
  mockSourceLabel: "当前页面使用前端 mock 数据，等待后端旅行看板接口接入。"
};

export async function getDashboardData(tripId: string): Promise<DashboardData> {
  return {
    ...dashboardData,
    trip: {
      ...dashboardData.trip,
      id: tripId || dashboardData.trip.id
    }
  };
}
