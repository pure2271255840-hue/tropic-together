import type { TripPhase1Data } from "./types";

const seedUpdatedAt = "2026-07-25T09:00:00+08:00";

export function createSeedTripData(tripId: string): TripPhase1Data {
  const resolvedTripId = tripId || "penang-kota-kinabalu-2026";

  return {
    trip: {
      id: resolvedTripId,
      name: "槟城 x 哥打京那巴鲁 10 天计划",
      subtitle: "先收集地点和理由，再一起确认可执行的行程版本。",
      ownerMemberId: "member-noah",
      startDate: "2026-08-01",
      endDate: "2026-08-10",
      timezone: "Asia/Kuala_Lumpur",
      destinations: ["槟城", "乔治市", "哥打京那巴鲁", "沙巴海岛"],
      phase: "itinerary_voting",
      inviteUrl: `https://tropic.local/trip/${resolvedTripId}/join`,
      hotelAddress: "George Town hotel / KK city hotel"
    },
    members: [
      { id: "member-noah", displayName: "Noah", role: "owner", color: "teal" },
      { id: "member-mia", displayName: "Mia", role: "member", color: "coral" },
      { id: "member-yuki", displayName: "Yuki", role: "member", color: "sunset" },
      { id: "member-leo", displayName: "Leo", role: "member", color: "leaf" }
    ],
    currentMemberId: "member-noah",
    places: [
      {
        id: "place-tanjung-aru",
        tripId: resolvedTripId,
        name: "丹绒亚路海滩 Tanjung Aru",
        city: "哥打京那巴鲁",
        category: "海滩",
        initialTag: "must_go",
        address: "Tanjung Aru Beach, Kota Kinabalu, Sabah",
        notes: "日落候选第一名，天气好就留完整傍晚。",
        suggestedDuration: "1.5 小时",
        coordinate: { lat: 5.9483, lng: 116.0416 },
        addedByMemberId: "member-noah",
        createdAt: "2026-07-24T09:20:00+08:00",
        updatedAt: seedUpdatedAt
      },
      {
        id: "place-chew-jetty",
        tripId: resolvedTripId,
        name: "姓周桥 Chew Jetty",
        city: "槟城",
        category: "景点",
        initialTag: "must_go",
        address: "Chew Jetty, George Town, Penang",
        notes: "傍晚光线更舒服，可以和乔治市老城安排在同一天。",
        suggestedDuration: "1 小时",
        coordinate: { lat: 5.414, lng: 100.3419 },
        addedByMemberId: "member-noah",
        createdAt: "2026-07-24T09:05:00+08:00",
        updatedAt: seedUpdatedAt
      },
      {
        id: "place-kek-lok-si",
        tripId: resolvedTripId,
        name: "极乐寺 Kek Lok Si",
        city: "槟城",
        category: "文化",
        initialTag: "nice_to_have",
        address: "Kek Lok Si Temple, Air Itam, Penang",
        notes: "建议上午去，避开正午和下午暴晒。",
        suggestedDuration: "2 小时",
        coordinate: { lat: 5.3988, lng: 100.2739 },
        addedByMemberId: "member-mia",
        createdAt: "2026-07-24T09:10:00+08:00",
        updatedAt: seedUpdatedAt
      },
      {
        id: "place-chinahouse",
        tripId: resolvedTripId,
        name: "ChinaHouse Penang",
        city: "槟城",
        category: "咖啡甜点",
        initialTag: "nice_to_have",
        address: "153 Beach Street, George Town, Penang",
        notes: "适合老城步行中途休息，蛋糕选择多。",
        suggestedDuration: "1 小时",
        coordinate: { lat: 5.4149, lng: 100.3389 },
        addedByMemberId: "member-yuki",
        createdAt: "2026-07-24T09:12:00+08:00",
        updatedAt: seedUpdatedAt
      },
      {
        id: "place-kk-waterfront",
        tripId: resolvedTripId,
        name: "KK Waterfront",
        city: "哥打京那巴鲁",
        category: "日落",
        initialTag: "nice_to_have",
        address: "Kota Kinabalu Waterfront, Sabah",
        notes: "适合第一晚熟悉周边，雨天也比较容易调整。",
        suggestedDuration: "1 小时",
        coordinate: { lat: 5.9804, lng: 116.0726 },
        addedByMemberId: "member-leo",
        createdAt: "2026-07-24T09:16:00+08:00",
        updatedAt: seedUpdatedAt
      },
      {
        id: "place-island-hopping",
        tripId: resolvedTripId,
        name: "东姑阿都拉曼海岛跳岛",
        city: "哥打京那巴鲁",
        category: "海岛",
        initialTag: "must_go",
        address: "Tunku Abdul Rahman Marine Park, Sabah",
        notes: "需要看天气和大家体力，可能占半天以上。",
        suggestedDuration: "半天",
        coordinate: { lat: 5.9887, lng: 115.9951 },
        addedByMemberId: "member-mia",
        createdAt: "2026-07-24T09:22:00+08:00",
        updatedAt: seedUpdatedAt
      }
    ],
    placeVotes: [
      {
        id: "place-vote-1",
        placeId: "place-tanjung-aru",
        memberId: "member-mia",
        value: "up",
        reason: "想看日落，适合放在 KK 第一晚。",
        updatedAt: seedUpdatedAt
      },
      {
        id: "place-vote-2",
        placeId: "place-tanjung-aru",
        memberId: "member-yuki",
        value: "up",
        reason: "天气好就很值得。",
        updatedAt: seedUpdatedAt
      },
      {
        id: "place-vote-3",
        placeId: "place-chew-jetty",
        memberId: "member-noah",
        value: "up",
        reason: "和老城顺路，傍晚去不赶。",
        updatedAt: seedUpdatedAt
      },
      {
        id: "place-vote-4",
        placeId: "place-chew-jetty",
        memberId: "member-mia",
        value: "up",
        reason: "可以和壁画街一起走。",
        updatedAt: seedUpdatedAt
      },
      {
        id: "place-vote-5",
        placeId: "place-kek-lok-si",
        memberId: "member-yuki",
        value: "down",
        reason: "怕上午太晒，而且和老城不太顺。",
        updatedAt: seedUpdatedAt
      },
      {
        id: "place-vote-6",
        placeId: "place-chinahouse",
        memberId: "member-mia",
        value: "up",
        reason: "下午茶休息点刚好。",
        updatedAt: seedUpdatedAt
      },
      {
        id: "place-vote-7",
        placeId: "place-kk-waterfront",
        memberId: "member-leo",
        value: "up",
        reason: "第一晚轻松一点。",
        updatedAt: seedUpdatedAt
      },
      {
        id: "place-vote-8",
        placeId: "place-island-hopping",
        memberId: "member-yuki",
        value: "down",
        reason: "如果前一天睡太晚，半天海岛可能太累。",
        updatedAt: seedUpdatedAt
      },
      {
        id: "place-vote-9",
        placeId: "place-island-hopping",
        memberId: "member-leo",
        value: "down",
        reason: "需要备用方案，不要塞进唯一晴天。",
        updatedAt: seedUpdatedAt
      }
    ],
    itineraryVersions: [
      {
        id: "itinerary-v1",
        tripId: resolvedTripId,
        versionNumber: 1,
        label: "草稿 v1",
        status: "draft",
        source: "ai",
        createdByMemberId: "member-noah",
        createdAt: "2026-07-24T13:10:00+08:00",
        updatedAt: "2026-07-24T13:10:00+08:00",
        days: [
          {
            id: "day-v1-2026-08-01",
            versionId: "itinerary-v1",
            date: "2026-08-01",
            title: "抵达槟城",
            city: "槟城",
            summary: "抵达、入住、附近晚餐。",
            items: [
              {
                id: "item-v1-0801-1",
                dayId: "day-v1-2026-08-01",
                title: "入住后附近晚餐",
                startTime: "19:00",
                endTime: "20:30",
                notes: "按航班到达时间微调。",
                isLocked: false
              }
            ]
          },
          {
            id: "day-v1-2026-08-04",
            versionId: "itinerary-v1",
            date: "2026-08-04",
            title: "乔治市老城",
            city: "槟城",
            summary: "老城步行，傍晚去姓周桥。",
            items: [
              {
                id: "item-v1-0804-1",
                dayId: "day-v1-2026-08-04",
                title: "ChinaHouse 下午茶",
                placeId: "place-chinahouse",
                startTime: "15:30",
                endTime: "16:30",
                notes: "中途休息点。",
                isLocked: true
              },
              {
                id: "item-v1-0804-2",
                dayId: "day-v1-2026-08-04",
                title: "姓周桥傍晚散步",
                placeId: "place-chew-jetty",
                startTime: "17:30",
                endTime: "18:30",
                notes: "看天气，日落前到。",
                isLocked: false
              }
            ]
          }
        ]
      },
      {
        id: "itinerary-v2",
        tripId: resolvedTripId,
        versionNumber: 2,
        label: "草稿 v2",
        status: "draft",
        source: "manual",
        createdByMemberId: "member-noah",
        createdAt: "2026-07-24T18:30:00+08:00",
        updatedAt: seedUpdatedAt,
        days: [
          {
            id: "day-v2-2026-08-01",
            versionId: "itinerary-v2",
            date: "2026-08-01",
            title: "抵达槟城",
            city: "槟城",
            summary: "抵达后只放轻松晚餐，保留体力。",
            items: [
              {
                id: "item-v2-0801-1",
                dayId: "day-v2-2026-08-01",
                title: "入住后附近晚餐",
                startTime: "19:00",
                endTime: "20:30",
                notes: "不锁死餐厅，大家到齐后再选。",
                isLocked: false
              }
            ]
          },
          {
            id: "day-v2-2026-08-04",
            versionId: "itinerary-v2",
            date: "2026-08-04",
            title: "乔治市老城",
            city: "槟城",
            summary: "下午茶后走到姓周桥，节奏更顺。",
            items: [
              {
                id: "item-v2-0804-1",
                dayId: "day-v2-2026-08-04",
                title: "ChinaHouse 下午茶",
                placeId: "place-chinahouse",
                startTime: "15:00",
                endTime: "16:00",
                notes: "休息补水，避免下午太满。",
                isLocked: true
              },
              {
                id: "item-v2-0804-2",
                dayId: "day-v2-2026-08-04",
                title: "姓周桥傍晚散步",
                placeId: "place-chew-jetty",
                startTime: "17:20",
                endTime: "18:30",
                notes: "如果下雨就改为室内咖啡。",
                isLocked: false
              }
            ]
          },
          {
            id: "day-v2-2026-08-07",
            versionId: "itinerary-v2",
            date: "2026-08-07",
            title: "哥打京那巴鲁日落",
            city: "哥打京那巴鲁",
            summary: "下午留白，傍晚去海边日落。",
            items: [
              {
                id: "item-v2-0807-1",
                dayId: "day-v2-2026-08-07",
                title: "丹绒亚路日落",
                placeId: "place-tanjung-aru",
                startTime: "17:20",
                endTime: "19:00",
                notes: "天气不好就换到 KK Waterfront。",
                isLocked: true
              },
              {
                id: "item-v2-0807-2",
                dayId: "day-v2-2026-08-07",
                title: "海边晚餐",
                startTime: "19:30",
                endTime: "21:00",
                notes: "保留大家现场选择。",
                isLocked: false
              }
            ]
          }
        ]
      }
    ],
    currentItineraryVersionId: "itinerary-v2",
    itineraryVotes: [
      {
        id: "itinerary-vote-1",
        versionId: "itinerary-v1",
        memberId: "member-mia",
        value: "down",
        reason: "v1 第四天太赶，下午茶和姓周桥之间留白不够。",
        updatedAt: "2026-07-24T15:00:00+08:00"
      },
      {
        id: "itinerary-vote-2",
        versionId: "itinerary-v2",
        memberId: "member-mia",
        value: "up",
        reason: "v2 节奏舒服，KK 日落安排也清楚。",
        updatedAt: seedUpdatedAt
      },
      {
        id: "itinerary-vote-3",
        versionId: "itinerary-v2",
        memberId: "member-yuki",
        value: "down",
        reason: "海岛跳岛还没有处理，希望有备用半天。",
        updatedAt: seedUpdatedAt
      },
      {
        id: "itinerary-vote-4",
        versionId: "itinerary-v2",
        memberId: "member-leo",
        value: "up",
        reason: "可以接受，争议点单独留备注就行。",
        updatedAt: seedUpdatedAt
      }
    ],
    updatedAt: seedUpdatedAt
  };
}
