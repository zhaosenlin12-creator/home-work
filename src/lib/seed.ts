import type { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./password";
import { petImage } from "./pet-assets";

export function seedIfEmpty(db: DatabaseSync) {
  const row = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (row.c > 0) return;

  // ---- 家长账号：demo / 123456 ----
  const parent = db
    .prepare(
      "INSERT INTO users (username, password_hash, name) VALUES (?, ?, ?)"
    )
    .run("demo", hashPassword("123456"), "林妈妈");
  const parentId = Number(parent.lastInsertRowid);

  // ---- 两个孩子：使用真实宠物图作头像 ----
  const childPw = hashPassword("123456");
  const xiaosenAvatar = petImage("cat", 3) || "/pets/cats/100000330.jpg";
  const xiaolingAvatar = petImage("rabbit", 2) || "/pets/rabbits/10001.jpg";

  const child1 = db
    .prepare(
      "INSERT INTO children (parent_id, name, password_hash, avatar_emoji, avatar_image, grade, points) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(parentId, "小森", childPw, "🐱", xiaosenAvatar, "三年级", 320);
  const c1 = Number(child1.lastInsertRowid);

  const child2 = db
    .prepare(
      "INSERT INTO children (parent_id, name, password_hash, avatar_emoji, avatar_image, grade, points) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(parentId, "小灵", childPw, "🐰", xiaolingAvatar, "一年级", 180);
  const c2 = Number(child2.lastInsertRowid);

  // ---- 任务 ----
  const tasks: [number, string, string, string, number, string, string][] = [
    [c1, "完成数学练习册 P32-35", "两位数乘法 20 题", "study", 20, "done", "2026-08-07"],
    [c1, "阅读《西游记》两章", "读完并讲给妈妈听", "reading", 15, "done", "2026-08-08"],
    [c1, "跳绳 500 个", "分 5 组完成", "sport", 10, "todo", "2026-08-09"],
    [c1, "整理书桌", "把课本按科目放好", "housework", 10, "todo", "2026-08-09"],
    [c1, "背 10 个英语单词", "apple/banana/orange...", "study", 15, "todo", "2026-08-10"],
    [c2, "画一幅夏日荷花图", "用蜡笔，A4 纸", "art", 20, "done", "2026-08-07"],
    [c2, "读绘本《猜猜我有多爱你》", "大声朗读一遍", "reading", 10, "done", "2026-08-08"],
    [c2, "帮妈妈摆碗筷", "晚饭前完成", "housework", 5, "todo", "2026-08-09"],
  ];
  const insTask = db.prepare(
    "INSERT INTO tasks (child_id, title, description, type, points, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  for (const t of tasks) insTask.run(...t);

  // ---- 番茄钟记录 ----
  const insPom = db.prepare(
    "INSERT INTO pomodoro_sessions (child_id, task_id, duration_min, started_at, completed_at) VALUES (?, ?, ?, ?, ?)"
  );
  insPom.run(c1, 1, 25, "2026-08-07 09:00:00", "2026-08-07 09:25:00");
  insPom.run(c1, 1, 25, "2026-08-07 09:30:00", "2026-08-07 09:55:00");
  insPom.run(c1, 2, 20, "2026-08-08 20:00:00", "2026-08-08 20:20:00");
  insPom.run(c2, 6, 15, "2026-08-07 15:00:00", "2026-08-07 15:15:00");

  // ---- 日记 ----
  const insDiary = db.prepare(
    "INSERT INTO diaries (child_id, content, mood, created_at) VALUES (?, ?, ?, ?)"
  );
  insDiary.run(c1, "今天读《西游记》，孙悟空太厉害了！我也想像他一样勇敢。", "excited", "2026-08-08 21:00:00");
  insDiary.run(c1, "跳绳跳了 400 个，还差 100 个明天加油！", "calm", "2026-08-07 20:30:00");
  insDiary.run(c2, "画了荷花，妈妈说很好看。", "happy", "2026-08-07 18:00:00");

  // ---- 宠物：使用真实图，按物种+等级自动选图 ----
  const insPet = db.prepare(
    "INSERT INTO pets (child_id, name, species, avatar_image, level, exp, hunger, happiness, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)"
  );
  insPet.run(c1, "团子", "cat", petImage("cat", 3), 3, 120, 70, 90);
  insPet.run(c2, "奶糖", "rabbit", petImage("rabbit", 2), 2, 40, 85, 85);

  // ---- 花园 ----
  const insPlant = db.prepare(
    "INSERT INTO garden_plants (child_id, plant_type, stage, planted_at, watered_at) VALUES (?, ?, ?, ?, ?)"
  );
  insPlant.run(c1, "tree", 3, "2026-07-01 10:00:00", "2026-08-08 08:00:00");
  insPlant.run(c1, "sunflower", 1, "2026-08-05 09:00:00", "2026-08-08 08:05:00");
  insPlant.run(c2, "flower", 2, "2026-07-10 10:00:00", "2026-08-08 08:10:00");

  // ---- 奖励商品 ----
  const insReward = db.prepare(
    "INSERT INTO rewards (parent_id, title, cost, icon) VALUES (?, ?, ?, ?)"
  );
  const r1 = insReward.run(parentId, "周末去游乐园", 200, "🎡");
  const r2 = insReward.run(parentId, "看一集动画片", 50, "📺");
  const r3 = insReward.run(parentId, "买一包贴纸", 30, "⭐");
  const r4 = insReward.run(parentId, "和妈妈做一次蛋糕", 150, "🧁");

  // ---- 兑换记录 ----
  const insClaim = db.prepare(
    "INSERT INTO reward_claims (child_id, reward_id, claimed_at) VALUES (?, ?, ?)"
  );
  insClaim.run(c1, Number(r2.lastInsertRowid), "2026-08-05 19:00:00");
  insClaim.run(c2, Number(r3.lastInsertRowid), "2026-08-06 18:00:00");

  // ---- 勋章定义 ----
  const badgeDefs: [string, string, string][] = [
    ["早起之星", "连续 7 天 7 点前起床", "🌅"],
    ["专注达人", "累计完成 10 个番茄钟", "⏱️"],
    ["阅读小书虫", "读完 5 本书", "📚"],
    ["运动小健将", "累计运动 3 小时", "🏃"],
    ["家务小能手", "完成 5 次家务", "🧹"],
    ["积分富翁", "积分达到 500", "💰"],
  ];
  const insBadge = db.prepare("INSERT INTO badges (name, description, icon) VALUES (?, ?, ?)");
  for (const b of badgeDefs) insBadge.run(...b);

  // ---- 孩子已获勋章 ----
  const insChildBadge = db.prepare(
    "INSERT INTO child_badges (child_id, badge_id, earned_at) VALUES (?, ?, ?)"
  );
  insChildBadge.run(c1, 2, "2026-08-06 20:00:00");
  insChildBadge.run(c1, 4, "2026-08-04 18:00:00");
  insChildBadge.run(c2, 6, "2026-08-03 12:00:00");

  // ---- 错题本 ----
  const insWrong = db.prepare(
    "INSERT INTO wrong_questions (child_id, subject, question, wrong_answer, correct_answer, reason) VALUES (?, ?, ?, ?, ?, ?)"
  );
  insWrong.run(c1, "数学", "23 × 4 = ?", "82", "92", "进位忘记加上");
  insWrong.run(c1, "英语", "banana 的中文是？", "橙子", "香蕉", "记混了水果单词");
  insWrong.run(c2, "数学", "8 + 7 = ?", "14", "15", "凑十法不熟练");

  // ---- 教材索引（ChinaTextbook 主科目常用版：小学/初中 × 语数英） ----
  const insTextbook = db.prepare(
    "INSERT INTO textbooks (stage, grade, subject, version, title) VALUES (?, ?, ?, ?, ?)"
  );
  const grades = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级", "初一", "初二", "初三"];
  const subjects = [
    { key: "chinese", name: "语文" },
    { key: "math", name: "数学" },
    { key: "english", name: "英语" },
  ];
  for (const g of grades) {
    for (const s of subjects) {
      insTextbook.run(
        g.startsWith("初") ? "junior" : "primary",
        g,
        s.key,
        "人教版",
        `${g}${s.name}（人教版）`
      );
    }
  }
}