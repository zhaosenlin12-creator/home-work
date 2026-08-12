"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { usePoints } from "@/lib/points-context";
import {
  GardenPlant,
  GardenBush,
  GardenPlot,
  Scarecrow,
  Beehive,
  Pebble,
  MountainBand,
  Cloud,
  Sun,
  House,
  Fence,
  GrassTuft,
  FlowerBed,
  Butterfly,
  Rainbow,
  gardenLabel,
  type GardenType,
} from "@/lib/garden-assets";
import {
  Sprout,
  Droplets,
  Sparkles,
  Trash2,
  ShoppingBag,
  Hand,
  Check,
  X,
  Star,
  Coins,
  TreePine,
  Sun as SunIcon,
  Flower2,
  Cherry,
  Apple,
  Citrus,
} from "lucide-react";
import { SEED_CATALOG } from "@/lib/garden-shop";

type Plant = {
  id: number;
  plant_type: GardenType;
  stage: number;
  plot_index: number;
  watered_at: string;
  harvested?: number;
};

type Inventory = { fertilizer?: number };

type ToolKey = "seed" | "water" | "fertilize" | "harvest" | "remove" | "shop" | "tools" | "menu";

const PLOT_VARIANTS = [0, 1, 2, 0, 1, 2, 0, 1, 2]; // 9 块差异化土壤

const SEEDS: {
  type: GardenType;
  label: string;
  cost: number;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  desc: string;
  color: string;
}[] = [
  { type: "tree", label: "大树", cost: 5, Icon: TreePine, desc: "强壮的成长树", color: "from-emerald-400 to-emerald-600" },
  { type: "sunflower", label: "向日葵", cost: 8, Icon: SunIcon, desc: "金灿灿向阳开", color: "from-yellow-300 to-amber-500" },
  { type: "flower", label: "小花", cost: 3, Icon: Flower2, desc: "可爱的小花", color: "from-pink-300 to-rose-500" },
  { type: "watermelon", label: "西瓜", cost: 15, Icon: Citrus, desc: "夏日清凉大西瓜", color: "from-red-400 to-rose-600" },
  { type: "pumpkin", label: "南瓜", cost: 12, Icon: Apple, desc: "金黄大南瓜", color: "from-orange-400 to-orange-600" },
  { type: "strawberry", label: "草莓", cost: 10, Icon: Cherry, desc: "甜甜的小草莓", color: "from-pink-500 to-rose-700" },
];

const FERTILIZER_COST = 10;

export default function KidGarden() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [inventory, setInventory] = useState<Inventory>({});
  const [me, setMe] = useState<{ id: number } | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const [openDrawer, setOpenDrawer] = useState<ToolKey | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone?: "ok" | "warn" } | null>(null);
  const [ripplingPlot, setRipplingPlot] = useState<number | null>(null);
  const [fertilizePlot, setFertilizePlot] = useState<number | null>(null);
  const [harvestPlot, setHarvestPlot] = useState<number | null>(null);
  const { refresh: refreshPoints } = usePoints();

  const plots = useMemo(() => {
    const arr: (Plant | null)[] = Array(9).fill(null);
    for (const p of plants) {
      if (p.plot_index >= 0 && p.plot_index < 9) arr[p.plot_index] = p;
    }
    return arr;
  }, [plants]);

  // 抽屉内容组件
  const seedEntries = Object.entries(SEED_CATALOG);
  const seedDrawer = (
    <div className="grid grid-cols-3 gap-3">
      {seedEntries.map(([key, s]) => (
        <button
          key={key}
          onClick={() => handleSelectSeed(key)}
          className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-gradient-to-br from-mint-soft to-white hover:scale-105 transition"
        >
          <GardenPlant type={key as GardenType} stage={3} className="w-14 h-14" />
          <span className="text-xs font-bold text-ink">{s.name}</span>
          <span className="text-xs text-mint-dark">{s.cost}分</span>
        </button>
      ))}
    </div>
  );

  const waterDrawer = (
    <div className="grid grid-cols-3 gap-3">
      {plots.map((p, i) => (
        <button
          key={i}
          onClick={() => waterPlot(i)}
          disabled={!p}
          className={`p-3 rounded-2xl flex flex-col items-center gap-1 ${p ? 'bg-blue-50 hover:bg-blue-100' : 'bg-gray-50 opacity-50'}`}
        >
          {p ? <GardenPlant type={p.plant_type} stage={p.stage} className="w-12 h-12" /> : <div className="w-12 h-12 bg-gray-200 rounded-full" />}
          <span className="text-xs text-ink">{p ? `Lv.${p.stage}` : '空地'}</span>
        </button>
      ))}
    </div>
  );

  const fertilizeDrawer = (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-2xl">
        <Sparkles className="text-amber-500" />
        <span className="text-sm font-medium">化肥库存: {inventory.fertilizer || 0} 袋</span>
        <button onClick={() => setOpenDrawer("shop")} className="ml-auto text-xs text-mint-dark font-bold">购买</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {plots.map((p, i) => (
          <button
            key={i}
            onClick={() => fertilizePlotAction(i)}
            disabled={!p || p.stage >= 5}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 ${p && p.stage < 5 ? 'bg-purple-50 hover:bg-purple-100' : 'bg-gray-50 opacity-50'}`}
          >
            {p ? <GardenPlant type={p.plant_type} stage={p.stage} className="w-12 h-12" /> : <div className="w-12 h-12 bg-gray-200 rounded-full" />}
            <span className="text-xs text-ink">{p ? `Lv.${p.stage}` : '空地'}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const harvestDrawer = (
    <div className="grid grid-cols-3 gap-3">
      {plots.map((p, i) => (
        <button
          key={i}
          onClick={() => harvestPlotAction(i)}
          disabled={!p || p.stage < 5}
          className={`p-3 rounded-2xl flex flex-col items-center gap-1 ${p && p.stage >= 5 ? 'bg-amber-50 hover:bg-amber-100' : 'bg-gray-50 opacity-50'}`}
        >
          {p ? <GardenPlant type={p.plant_type} stage={p.stage} className="w-12 h-12" /> : <div className="w-12 h-12 bg-gray-200 rounded-full" />}
          <span className="text-xs text-ink">{p ? (p.stage >= 5 ? '可收获' : `Lv.${p.stage}`) : '空地'}</span>
        </button>
      ))}
    </div>
  );

  const removeDrawer = (
    <div className="grid grid-cols-3 gap-3">
      {plots.map((p, i) => (
        <button
          key={i}
          onClick={() => removePlotAction(i)}
          disabled={!p}
          className={`p-3 rounded-2xl flex flex-col items-center gap-1 ${p ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 opacity-50'}`}
        >
          {p ? <GardenPlant type={p.plant_type} stage={p.stage} className="w-12 h-12" /> : <div className="w-12 h-12 bg-gray-200 rounded-full" />}
          <span className="text-xs text-ink">{p ? '移除' : '空地'}</span>
        </button>
      ))}
    </div>
  );

  const toolsDrawer = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setOpenDrawer("shop")} className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl">
          <ShoppingBag className="text-emerald-500" size={24} />
          <div className="text-left">
            <div className="text-sm font-bold text-ink">道具商城</div>
            <div className="text-xs text-ink-soft">买化肥、种子</div>
          </div>
        </button>
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl">
          <Coins className="text-blue-500" size={24} />
          <div className="text-left">
            <div className="text-sm font-bold text-ink">当前积分</div>
            <PointsValue />
          </div>
        </div>
      </div>
    </div>
  );

  async function load() {
    try {
      const m = await api<{ id: number }>("/api/auth/me");
      setMe(m as never);
      const d = await api<{ plants: Plant[]; inventory: Inventory }>(
        `/api/garden?childId=${m.id}`
      );
      setPlants(d.plants);
      setInventory(d.inventory ?? {});
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(msg: string, tone?: "ok" | "warn") {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2200);
  }

  async function waterPlot(plotIndex: number) {
    if (!me) return;
    const plant = plots[plotIndex];
    if (!plant) {
      showToast("这块地空着，先种一颗吧", "warn");
      return;
    }
    if (plant.stage >= 5) {
      showToast("已经长到最大啦，该收获啦", "warn");
      return;
    }
    setRipplingPlot(plotIndex);
    setTimeout(() => setRipplingPlot(null), 1200);
    try {
      await api("/api/garden/water", {
        method: "POST",
        body: JSON.stringify({ childId: me.id, plotIndex }),
      });
      showToast("长大了一点！", "ok");
      load();
    } catch (e) {
      showToast((e as Error).message, "warn");
    }
  }

  async function fertilizePlotAction(plotIndex: number) {
    if (!me) return;
    const plant = plots[plotIndex];
    if (!plant) {
      showToast("这块地空着，先种一颗吧", "warn");
      return;
    }
    if (plant.stage >= 5) {
      showToast("已经长到最大，不需要施肥", "warn");
      return;
    }
    if ((inventory.fertilizer ?? 0) < 1) {
      showToast("肥料不足，先去商店买吧", "warn");
      setOpenDrawer("shop");
      return;
    }
    setFertilizePlot(plotIndex);
    setTimeout(() => setFertilizePlot(null), 900);
    try {
      await api("/api/garden/fertilize", {
        method: "POST",
        body: JSON.stringify({ childId: me.id, plotIndex }),
      });
      showToast("施肥成功，长大了一级！", "ok");
      load();
    } catch (e) {
      showToast((e as Error).message, "warn");
    }
  }

  async function harvestPlotAction(plotIndex: number) {
    if (!me) return;
    const plant = plots[plotIndex];
    if (!plant || plant.stage < 5) {
      showToast("还没长到最大级，先继续照顾", "warn");
      return;
    }
    setHarvestPlot(plotIndex);
    setTimeout(() => setHarvestPlot(null), 1200);
    try {
      const r = await api<{ cropName: string; reward: number }>(
        "/api/garden/harvest",
        {
          method: "POST",
          body: JSON.stringify({ childId: me.id, plotIndex }),
        }
      );
      showToast(`收获啦！${r.cropName} +${r.reward} 积分`, "ok");
      refreshPoints();
      load();
    } catch (e) {
      showToast((e as Error).message, "warn");
    }
  }

  async function removePlotAction(plotIndex: number) {
    if (!me) return;
    const plant = plots[plotIndex];
    if (!plant) {
      showToast("这块地空着", "warn");
      return;
    }
    try {
      await api(`/api/garden/plant/${plant.id}`, { method: "DELETE" });
      showToast("已移除", "ok");
      load();
    } catch (e) {
      showToast((e as Error).message, "warn");
    }
  }

  async function buyFertilizer() {
    if (!me) return;
    try {
      const r = await api<{ totalCost: number; count: number }>(
        "/api/garden/buy",
        {
          method: "POST",
          body: JSON.stringify({ childId: me.id, itemKey: "fertilizer", quantity: 1 }),
        }
      );
      showToast(`已购 ${r.count} 袋肥料`, "ok");
      refreshPoints();
      load();
    } catch (e) {
      showToast((e as Error).message, "warn");
    }
  }

  async function plantSeed(type: GardenType) {
    if (!me) return;
    const seed = SEEDS.find((s) => s.type === type);
    if (!seed) return;
    // 自动找一个空地
    const empty = plots.findIndex((p) => !p);
    if (empty < 0) {
      showToast("田地都种满了，先收获或移除一些", "warn");
      return;
    }
    try {
      await api("/api/garden", {
        method: "POST",
        body: JSON.stringify({ childId: me.id, plantType: type, plotIndex: empty }),
      });
      showToast(`种下了一颗${seed.label}！`, "ok");
      load();
      setOpenDrawer(null);
    } catch (e) {
      showToast((e as Error).message, "warn");
    }
  }

  function handleSelectSeed(key: string) {
    plantSeed(key as GardenType);
  }

  const fertilizerCount = inventory.fertilizer ?? 0;

  return (
    <div className="farm-world">
      {/* 全屏沉浸背景：天空+远山+云 */}
      <div className="farm-bg">
        <div className="farm-sky" />
        {/* 太阳（左上，缓慢自转光芒） */}
        <div className="farm-sun">
          <Sun className="farm-sun-svg" />
        </div>
        {/* 彩虹（远山后） */}
        <div className="farm-rainbow">
          <Rainbow className="farm-rainbow-svg" />
        </div>
        <div className="farm-mountain">
          <MountainBand className="farm-mountain-svg" />
        </div>
        {/* 远景小木屋 */}
        <div className="farm-house">
          <House className="farm-house-svg" />
        </div>
        <div className="farm-clouds">
          <Cloud className="farm-cloud" style={{ left: "8%", top: "5%", width: 96, height: 48, opacity: 0.85 }} />
          <Cloud className="farm-cloud" style={{ left: "55%", top: "3%", width: 110, height: 55, opacity: 0.9 }} />
          <Cloud className="farm-cloud" style={{ left: "30%", top: "11%", width: 80, height: 40, opacity: 0.7 }} />
        </div>
        {/* 远景装饰 */}
        <div className="farm-far-decor" aria-hidden="true">
          <GardenBush variant={1} className="farm-far-bush" style={{ left: "4%", top: "26%", width: 120, height: 100, opacity: 0.55 }} />
          <GardenBush variant={0} className="farm-far-bush" style={{ left: "78%", top: "30%", width: 140, height: 120, opacity: 0.5 }} />
          <Scarecrow className="farm-far-scarecrow" style={{ left: "46%", top: "30%", width: 60, height: 110, opacity: 0.85 }} />
          <Beehive className="farm-far-beehive" style={{ right: "6%", top: "40%", width: 56, height: 78, opacity: 0.92 }} />
        </div>
        <div className="farm-ground" />
        {/* 栅栏（近景边框，专业农场感） */}
        <div className="farm-fence-top" aria-hidden="true">
          <Fence className="farm-fence-svg" />
        </div>
        <div className="farm-fence-left" aria-hidden="true">
          <Fence className="farm-fence-svg" />
        </div>
        <div className="farm-fence-right" aria-hidden="true">
          <Fence className="farm-fence-svg" />
        </div>
        {/* 近景装饰：鹅卵石路径 + 草丛 + 花丛 + 蝴蝶 */}
        <div className="farm-path" aria-hidden="true">
          <Pebble className="farm-pebble" style={{ left: "6%", bottom: "26%", width: 70, height: 26, opacity: 0.85 }} />
          <Pebble className="farm-pebble" style={{ right: "6%", bottom: "32%", width: 80, height: 28, opacity: 0.85 }} />
          <Pebble className="farm-pebble" style={{ left: "46%", bottom: "13%", width: 64, height: 24, opacity: 0.7 }} />
        </div>
        <div className="farm-grass" aria-hidden="true">
          <GrassTuft variant={0} className="farm-grass-tuft" style={{ left: "2%", bottom: "8%", width: 70, height: 52, opacity: 0.85 }} />
          <GrassTuft variant={1} className="farm-grass-tuft" style={{ right: "3%", bottom: "12%", width: 80, height: 60, opacity: 0.85 }} />
          <GrassTuft variant={2} className="farm-grass-tuft" style={{ left: "48%", bottom: "4%", width: 60, height: 45, opacity: 0.7 }} />
        </div>
        <div className="farm-flowerbed" aria-hidden="true">
          <FlowerBed className="farm-flowerbed-svg" style={{ left: "4%", bottom: "16%", width: 110, height: 62, opacity: 0.9 }} />
        </div>
        {/* 动态蝴蝶 */}
        <div className="farm-butterfly" aria-hidden="true">
          <Butterfly className="farm-butterfly-svg" />
        </div>
      </div>

      {/* 顶部状态栏 */}
      <div className="farm-top">
        <div className="farm-top-card">
          <div className="farm-title">
            <Sparkles size={18} className="text-mint-dark" />
            <div>
              <div className="farm-title-main">我的小农场</div>
              <div className="farm-title-sub">点地块 · 用工具 · 收获果实</div>
            </div>
          </div>
          <div className="farm-stats">
            <button
              onClick={() => setOpenDrawer("shop")}
              className="farm-stat-chip farm-fertilizer"
              title="去商店买肥料"
            >
              <Coins size={14} />
              <span className="farm-stat-num">{fertilizerCount}</span>
              <span className="farm-stat-label">袋肥</span>
            </button>
            <span className="farm-stat-chip farm-points">
              <Star size={14} className="text-warning" fill="currentColor" />
              <span className="farm-stat-num">
                <PointsValue />
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* 田地 3x3 grid */}
      <div className="farm-field">
        {plots.map((p, i) => (
          <Plot
            key={i}
            plotIndex={i}
            plant={p}
            variant={PLOT_VARIANTS[i]}
            selected={selectedPlot === i}
            rippling={ripplingPlot === i}
            fertilizing={fertilizePlot === i}
            harvesting={harvestPlot === i}
            onClick={() => setSelectedPlot(i)}
            onHarvest={() => harvestPlotAction(i)}
          />
        ))}
      </div>

      {/* 底部操作中心 - SpeedDial 风格（点开 6 个操作） */}
      <div className={`farm-action-hub ${openDrawer === "menu" ? "open" : ""}`}>
        {/* 选中地块提示 */}
        {openDrawer === "menu" && selectedPlot !== null && (
          <div className="farm-action-hint">
            地块 #{selectedPlot + 1}
            {plots[selectedPlot] ? ` · Lv.${plots[selectedPlot]!.stage}` : " · 空地"}
          </div>
        )}

        {/* 6 个操作按钮（围在主 FAB 周围） */}
        <button
          onClick={() => setOpenDrawer("seed")}
          className="farm-fab farm-fab-1"
          title="选种子种到空地"
          aria-label="种植"
        >
          <Sprout size={26} />
        </button>
        <button
          onClick={() => {
            if (selectedPlot === null) {
              showToast("请先点选一块地", "warn");
              return;
            }
            waterPlot(selectedPlot);
            setOpenDrawer(null);
          }}
          className="farm-fab farm-fab-2"
          title="给选中地块浇水"
          aria-label="浇水"
        >
          <Droplets size={26} />
        </button>
        <button
          onClick={() => {
            if (selectedPlot === null) {
              showToast("请先点选一块地", "warn");
              return;
            }
            fertilizePlotAction(selectedPlot);
            setOpenDrawer(null);
          }}
          className="farm-fab farm-fab-3"
          title="给选中地块施肥"
          aria-label="施肥"
        >
          <Sparkles size={26} />
        </button>
        <button
          onClick={() => {
            if (selectedPlot === null) {
              showToast("请先点选一块地", "warn");
              return;
            }
            harvestPlotAction(selectedPlot);
            setOpenDrawer(null);
          }}
          className="farm-fab farm-fab-4"
          title="收获选中地块"
          aria-label="收获"
        >
          <Check size={26} />
        </button>
        <button
          onClick={() => {
            if (selectedPlot === null) {
              showToast("请先点选一块地", "warn");
              return;
            }
            removePlotAction(selectedPlot);
            setOpenDrawer(null);
          }}
          className="farm-fab farm-fab-5"
          title="移除选中地块的植物"
          aria-label="移除"
        >
          <Trash2 size={26} />
        </button>
        <button
          onClick={() => setOpenDrawer("shop")}
          className="farm-fab farm-fab-6"
          title="去商店买肥料"
          aria-label="商店"
        >
          <ShoppingBag size={26} />
        </button>

        {/* 主 FAB 按钮 */}
        <button
          onClick={() => setOpenDrawer(openDrawer === "menu" ? null : "menu")}
          className="farm-menu-btn"
          aria-label="操作菜单"
          aria-expanded={openDrawer === "menu"}
        >
          {openDrawer === "menu" ? <X size={28} /> : <Sprout size={28} />}
        </button>
      </div>

      {/* 操作抽屉 - 从底部滑出 */}
      {openDrawer && openDrawer !== "menu" && (
        <div className="farm-drawer">
          <div className="farm-drawer-header">
            <span className="farm-drawer-title">
              {openDrawer === "seed" && "🌱 选择种子"}
              {openDrawer === "water" && "💧 浇水"}
              {openDrawer === "fertilize" && "🧪 施肥"}
              {openDrawer === "harvest" && "🌾 收获"}
              {openDrawer === "remove" && "🗑️ 移除"}
              {openDrawer === "tools" && "🔧 工具箱"}
            </span>
            <button onClick={() => setOpenDrawer(null)} className="farm-drawer-close">
              <X size={20} />
            </button>
          </div>
          <div className="farm-drawer-content">
            {openDrawer === "seed" && seedDrawer}
            {openDrawer === "water" && waterDrawer}
            {openDrawer === "fertilize" && fertilizeDrawer}
            {openDrawer === "harvest" && harvestDrawer}
            {openDrawer === "remove" && removeDrawer}
            {openDrawer === "tools" && toolsDrawer}
          </div>
        </div>
      )}

      {/* 操作抽屉遮罩 */}
      {openDrawer && openDrawer !== "menu" && (
        <div className="farm-drawer-mask" onClick={() => setOpenDrawer(null)} />
      )}

      {/* 抽屉：种子（左侧滑入） */}
      {openDrawer === "seed" && (
        <div className="farm-drawer farm-drawer-left">
          <div className="farm-drawer-title">
            <span className="farm-drawer-bar" />
            <Sprout size={16} className="text-mint-dark" />
            <span>选种子种到空地</span>
            <button
              onClick={() => setOpenDrawer(null)}
              className="farm-drawer-close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="farm-drawer-grid">
            {SEEDS.map((s) => (
              <button
                key={s.type}
                onClick={() => plantSeed(s.type)}
                className="farm-seed-card"
              >
                <div className={`farm-seed-icon bg-gradient-to-br ${s.color}`}>
                  <s.Icon size={26} className="text-white" />
                </div>
                <div className="farm-seed-name">{s.label}</div>
                <div className="farm-seed-desc">{s.desc}</div>
                <div className="farm-seed-cost">
                  <Star size={12} fill="currentColor" className="text-warning" />
                  <span>{s.cost}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="farm-drawer-hint">点种子自动种到最近的空地</p>
        </div>
      )}

      {/* 抽屉：工具（右侧滑入） */}
      {openDrawer === "tools" && (
        <div className="farm-drawer farm-drawer-right">
          <div className="farm-drawer-title">
            <span className="farm-drawer-bar" />
            <Hand size={16} className="text-secondary-deep" />
            <span>工具栏</span>
            <button
              onClick={() => setOpenDrawer(null)}
              className="farm-drawer-close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="farm-drawer-tools">
            <ToolAction
              color="from-sky-300 to-sky-500"
              icon={<Droplets size={28} />}
              label="浇水"
              desc="选中地块浇水，长大一点"
              onClick={() => {
                if (selectedPlot === null) {
                  showToast("请先点选一块地", "warn");
                  return;
                }
                waterPlot(selectedPlot);
              }}
            />
            <ToolAction
              color="from-amber-300 to-amber-500"
              icon={<Sparkles size={28} />}
              label="施肥"
              desc={`当前库存 ${fertilizerCount} 袋`}
              onClick={() => {
                if (selectedPlot === null) {
                  showToast("请先点选一块地", "warn");
                  return;
                }
                fertilizePlotAction(selectedPlot);
              }}
            />
            <ToolAction
              color="from-emerald-400 to-emerald-600"
              icon={<Check size={28} />}
              label="收获"
              desc="满级作物可收获换积分"
              onClick={() => {
                if (selectedPlot === null) {
                  showToast("请先点选一块地", "warn");
                  return;
                }
                harvestPlotAction(selectedPlot);
              }}
            />
            <ToolAction
              color="from-rose-300 to-rose-500"
              icon={<Trash2 size={28} />}
              label="移除"
              desc="清空这块地的植物"
              onClick={() => {
                if (selectedPlot === null) {
                  showToast("请先点选一块地", "warn");
                  return;
                }
                removePlotAction(selectedPlot);
              }}
            />
            <ToolAction
              color="from-yellow-300 to-amber-500"
              icon={<ShoppingBag size={28} />}
              label="商店"
              desc={`10 积分 / 袋肥料`}
              onClick={() => setOpenDrawer("shop")}
            />
          </div>
        </div>
      )}

      {/* 商店弹窗 */}
      {openDrawer === "shop" && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end justify-center p-4"
          onClick={() => setOpenDrawer(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-card animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-ink text-lg flex items-center gap-1.5">
                <ShoppingBag size={20} className="text-warning" /> 农场商店
              </h3>
              <button
                onClick={() => setOpenDrawer(null)}
                className="w-8 h-8 rounded-full bg-cream text-ink-soft flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-card">
                  <Sparkles size={28} className="text-warning" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-ink">成长肥料</div>
                  <div className="text-xs text-ink-soft">撒 1 袋直接让植物长大 1 级</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm">
                  <span className="text-ink-soft">库存：</span>
                  <span className="font-bold text-ink">{fertilizerCount}</span>
                  <span className="text-xs text-ink-soft ml-1">袋</span>
                </div>
                <button
                  onClick={buyFertilizer}
                  className="btn-game btn-primary flex items-center gap-1.5"
                >
                  <Coins size={14} />
                  <span>{FERTILIZER_COST}</span>
                  <span className="text-xs">购买</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`farm-toast ${
            toast.tone === "warn" ? "farm-toast-warn" : "farm-toast-ok"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function PointsValue() {
  const { points } = usePoints();
  return <>{points ?? 0}</>;
}

function Plot({
  plotIndex,
  plant,
  variant,
  selected,
  rippling,
  fertilizing,
  harvesting,
  onClick,
  onHarvest,
}: {
  plotIndex: number;
  plant: Plant | null;
  variant: number;
  selected: boolean;
  rippling: boolean;
  fertilizing: boolean;
  harvesting: boolean;
  onClick: () => void;
  onHarvest: () => void;
}) {
  const mature = plant !== null && plant.stage >= 5;
  return (
    <div
      className={`farm-plot ${selected ? "selected" : ""} ${mature ? "mature" : ""} ${
        !plant ? "empty-hint" : ""
      }`}
      onClick={onClick}
    >
      <GardenPlot variant={variant} className="farm-plot-bg" />
      <div className="farm-plot-content">
        {plant ? (
          <>
            <div
              className={`farm-plant ${mature ? "sway-anim" : ""} ${
                rippling ? "water-ripple-anim" : ""
              } ${fertilizing ? "fertilize-pop" : ""} ${
                harvesting ? "harvest-pop" : ""
              }`}
            >
              <GardenPlant type={plant.plant_type} stage={plant.stage} />
            </div>
            <div className={`farm-plot-badge ${mature ? "mature-badge" : ""}`}>
              {mature ? "已熟" : `Lv.${plant.stage}`}
            </div>
            {mature && (
              <>
                {/* 成熟光效 */}
                <div className="farm-mature-glow" />
                <button
                  className="farm-harvest-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHarvest();
                  }}
                >
                  <Check size={14} />
                </button>
              </>
            )}
            <div className="farm-plot-progress">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`farm-progress-seg ${
                    s <= plant.stage ? "filled" : ""
                  }`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="farm-plot-empty">
            <Sprout size={20} className="text-cream/40" />
            <span className="farm-plot-idx">{plotIndex + 1}</span>
            <span className="farm-plot-hint">点击种植</span>
          </div>
        )}
      </div>
      {selected && <div className="farm-plot-ring" />}
      {rippling && (
        <div className="farm-water-ripple">
          <div className="water-ripple" />
          <div className="water-ripple" style={{ animationDelay: "0.3s" }} />
        </div>
      )}
    </div>
  );
}

function ToolAction({
  color,
  icon,
  label,
  desc,
  onClick,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="farm-tool-card">
      <div className={`farm-tool-icon bg-gradient-to-br ${color}`}>{icon}</div>
      <div className="farm-tool-info">
        <div className="farm-tool-name">{label}</div>
        <div className="farm-tool-desc">{desc}</div>
      </div>
    </button>
  );
}