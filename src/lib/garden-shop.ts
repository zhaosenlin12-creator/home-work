// 花园道具商城（肥料 / 种子袋 / 作物奖励）
export const GARDEN_PLOTS = 9; // 9 个地块 0-8

export const FERTILIZER_ITEMS = {
  fertilizer: {
    key: "fertilizer",
    name: "成长肥料",
    desc: "撒 1 袋直接让植物长大 1 级（上限 5 级）",
    cost: 10,
    icon: "fert",
  },
} as const;

export type FertilizerKey = keyof typeof FERTILIZER_ITEMS;

/** 作物目录：种类 → 收获积分奖励 */
export const CROP_REWARD: Record<string, { name: string; reward: number }> = {
  tree: { name: "大树", reward: 30 },
  sunflower: { name: "向日葵", reward: 20 },
  flower: { name: "小花", reward: 15 },
  watermelon: { name: "大西瓜", reward: 45 },
  pumpkin: { name: "大南瓜", reward: 35 },
  strawberry: { name: "草莓", reward: 25 },
};

/** 种子商店：种类 → 积分价格 */
export const SEED_CATALOG: Record<string, { name: string; cost: number; desc: string }> = {
  tree: { name: "大树", cost: 5, desc: "强壮的成长树" },
  sunflower: { name: "向日葵", cost: 8, desc: "金灿灿向阳开" },
  flower: { name: "小花", cost: 3, desc: "可爱的小花" },
  watermelon: { name: "西瓜", cost: 15, desc: "夏日清凉大西瓜" },
  pumpkin: { name: "南瓜", cost: 12, desc: "金黄大南瓜" },
  strawberry: { name: "草莓", cost: 10, desc: "甜甜的小草莓" },
};