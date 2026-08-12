// 宠物物种目录（完整十级资源库：camp-pk-system pet-mirror/cwk，95 物种 × 10 级）
// 可扩展：cwk 目录新增物种目录即自动出现在商城

import { cwkSpeciesKeys, petImage } from "./pet-assets";

export type PetSpecies = {
  key: string;
  name: string;
  desc: string;
  /** 商城价格（积分）；0 = 初始可选 */
  price: number;
  /** 前置条件：累计完成任务数 */
  requireTasks: number;
  /** 初始可选的基础宠物 */
  base: boolean;
};

/** cwk 物种中文名映射（未收录的用原 key 兜底） */
const CN_NAMES: Record<string, string> = {
  baize: "白泽",
  PANDA: "熊猫",
  coffeecat: "咖啡猫",
  hashiqi: "哈士奇",
  xuebao: "雪豹",
  aijiaomao: "爱教猫",
  angenla: "安哥拉兔",
  banliegou: "斑鬣狗",
  BanMa: "斑马",
  bianmu: "蝙蝠",
  binghuang: "冰凰",
  bixiong: "比熊犬",
  bomei: "博美犬",
  boshimoa: "波斯猫",
  BThaidiao: "海雕",
  budding: "布丁兔",
  buomao: "布偶猫",
  caiquan: "彩虹犬",
  CHANGJIANGJIANNGTUN: "长江江豚",
  CHUANSHANJIA: "穿山甲",
  dapeng: "大鹏",
  dbhu: "呆萌狐",
  DONGFANGRIGUAN: "东方日冠",
  feizhoushi: "非洲狮",
  fuzhu: "福气猪",
  glodcat: "金猫",
  gudiaodiao: "古雕",
  haozhi: "豪猪",
  helanzhu: "荷兰猪",
  HELI: "河狸",
  huolong: "火龙",
  jingwei: "精卫",
  jinpeng: "金鹏",
  jinsixs: "金丝猴",
  JIUWEILH: "九尾灵狐",
  julang: "巨狼",
  keji: "柯基犬",
  longmao: "龙猫",
  maotu: "猫兔",
  MEIHUALU: "梅花鹿",
  meizhoubao: "美洲豹",
  midaishu: "蜜袋鼯",
  miniciw: "迷你刺猬",
  pixiu: "貔貅",
  qilin: "麒麟",
  qingluan: "青鸾",
  qiongqi: "穷奇",
  shuima: "水马",
  SHUITA: "水獭",
  smye: "萨摩耶",
  taidi: "泰迪犬",
  taowu: "梼杌",
  TUSUN: "兔狲",
  XIANHUANXIONG: "浣熊",
  YANGZIE: "扬子鳄",
  YAZHOUXIANG: "亚洲象",
  yinglong: "应龙",
  ZANGLINGYANG: "藏羚羊",
  zhongxiong: "棕熊",
  ZHUHUAN: "朱鹮",
  zhuru: "竹鼠",
  zhuruotu: "侏儒兔",
  zouwu: "驺吾",
  yincsu: "银刺猬",
  yingduan: "鹰隼",
  yinjian: "银箭鱼",
  ERKUOHU: "耳廓狐",
  ershu: "耳鼠",
  shm: "四不像",
  lili: "莉莉狐",
  mengji: "梦幻鸡",
  orgen: "橘猫",
  huodou: "火豆豚",
  qianyang: "千岁羊",
  qiezhi: "茄紫猫",
  honfus: "鸿鹄",
  huban: "虎斑猫",
  chuietu: "垂耳兔",
  glodmao: "金毛猫",
  LANYANFH: "蓝眼凤凰",
  LBLD: "蓝白龙",
};

/** 初始可选的基础宠物 */
const BASE_KEYS = ["baize", "PANDA", "coffeecat", "hashiqi", "xuebao"];

function speciesName(key: string): string {
  return CN_NAMES[key] || key;
}

function buildCatalog(): PetSpecies[] {
  const keys = cwkSpeciesKeys();
  // 基础 5 种排最前
  const ordered = [...BASE_KEYS, ...keys.filter((k) => !BASE_KEYS.includes(k))];
  // 商城分档：按位置递增难度
  const tier = ordered.length - BASE_KEYS.length;
  return ordered.map((key, i) => {
    const base = i < BASE_KEYS.length;
    if (base) {
      return { key, name: speciesName(key), desc: "初始可选的基础宠物", price: 0, requireTasks: 0, base: true };
    }
    const idx = i - BASE_KEYS.length;
    // requireTasks: 1 → 20 阶梯；price: 50 → 300（友好分档，孩子可达）
    const requireTasks = Math.min(20, 1 + Math.floor((idx / Math.max(1, tier)) * 19));
    const price = Math.min(300, 50 + Math.floor((idx / Math.max(1, tier)) * 250));
    return { key, name: speciesName(key), desc: "在宠物商城解锁的稀有伙伴", price, requireTasks, base: false };
  });
}

export const PET_CATALOG: PetSpecies[] = buildCatalog();

export function getSpeciesMeta(key: string): PetSpecies | undefined {
  return PET_CATALOG.find((s) => s.key === key);
}

/** 该物种商城展示图（等级 3 形态） */
export function speciesImage(key: string): string {
  const img = petImage(key, 3);
  return img || "/pets/cwk/baize/03.jpg";
}