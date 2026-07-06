export type DestinationTag = {
  city: string;
  mood: string;
  tone: "teal" | "coral" | "sunset" | "leaf";
};

export type TripMember = {
  name: string;
  role: string;
  avatar: string;
};

export type TripSummary = {
  id: string;
  name: string;
  subtitle: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  timezone: string;
  destinations: DestinationTag[];
  members: TripMember[];
};

export type PlanStatus = "已确认" | "待确认" | "备选";

export type TodayPlan = {
  dateLabel: string;
  city: string;
  theme: string;
  status: PlanStatus;
  meetingTime: string;
  meetingPlace: string;
  nextActivity: string;
  owner: TripMember;
  reminder: string;
};

export type TaskPriority = "高" | "中" | "低";

export type DashboardTask = {
  id: string;
  title: string;
  status: "未开始" | "进行中" | "等待决定" | "已预订 / 已确认" | "已完成";
  owner?: TripMember;
  dueDate: string;
  dueLabel: string;
  priority: TaskPriority;
  relatedTo: string;
  note: string;
};

export type PlaceIdea = {
  id: string;
  name: string;
  city: string;
  category: string;
  status: PlanStatus | "尚未安排";
  addedBy: TripMember;
  voteSummary: string;
  suggestedTime: string;
};

export type DashboardData = {
  trip: TripSummary;
  todayPlan: TodayPlan | null;
  upcomingTask: DashboardTask | null;
  dueSoonTasks: DashboardTask[];
  unassignedTasks: DashboardTask[];
  recentPlaces: PlaceIdea[];
  mockSourceLabel: string;
};
