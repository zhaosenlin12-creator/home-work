import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { seedIfEmpty } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");
// 支持环境变量覆盖文件名（如 SENLIN_DB_FILE=senlin-prod.db），便于绕过被锁文件/多环境隔离
const DB_FILE = process.env.SENLIN_DB_FILE || "senlin.db";
const DB_PATH = path.join(DATA_DIR, DB_FILE);

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    initSchema(db);
    seedIfEmpty(db);
  }
  return db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    -- 家长账号
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 孩子
    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL DEFAULT '',
      avatar_emoji TEXT NOT NULL DEFAULT '🐣',
      avatar_image TEXT NOT NULL DEFAULT '',
      grade TEXT NOT NULL DEFAULT '一年级',
      points INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 任务
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      type TEXT NOT NULL DEFAULT 'study',
      subject TEXT DEFAULT '',
      points INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'todo',
      due_date TEXT DEFAULT '',
      needs_review INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 练习任务（AI 出题生成：一任务 = 一组题目，含评分器信息）
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      creator_type TEXT NOT NULL DEFAULT 'parent',
      subject TEXT NOT NULL DEFAULT 'math',
      kind TEXT NOT NULL DEFAULT 'mental-math',
      title TEXT NOT NULL,
      total_items INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      reward_points INTEGER NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 题目明细（kind 决定题型与评分器）
    CREATE TABLE IF NOT EXISTS exercise_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT NOT NULL DEFAULT '',
      hint TEXT DEFAULT '',
      user_answer TEXT DEFAULT '',
      is_correct INTEGER DEFAULT 0,
      answered_at TEXT DEFAULT ''
    );

    -- 教材索引（ChinaTextbook 目录，年级→学科→版本→资源）
    CREATE TABLE IF NOT EXISTS textbooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stage TEXT NOT NULL DEFAULT 'primary',
      grade TEXT NOT NULL,
      subject TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '人教版',
      title TEXT NOT NULL,
      pdf_path TEXT DEFAULT '',
      updated_at TEXT DEFAULT ''
    );

    -- 番茄钟
    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      duration_min INTEGER NOT NULL DEFAULT 25,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL
    );

    -- 日记
    CREATE TABLE IF NOT EXISTS diaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      mood TEXT NOT NULL DEFAULT 'happy',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 宠物（孩子可拥有多只，is_active 标记当前激活）
    CREATE TABLE IF NOT EXISTS pets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT '小伴',
      species TEXT NOT NULL DEFAULT 'cat',
      avatar_image TEXT NOT NULL DEFAULT '',
      level INTEGER NOT NULL DEFAULT 1,
      exp INTEGER NOT NULL DEFAULT 0,
      hunger INTEGER NOT NULL DEFAULT 80,
      happiness INTEGER NOT NULL DEFAULT 80,
      is_active INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'initial',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 花园植物
    CREATE TABLE IF NOT EXISTS garden_plants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      plant_type TEXT NOT NULL DEFAULT 'tree',
      stage INTEGER NOT NULL DEFAULT 1,
      plot_index INTEGER NOT NULL DEFAULT -1,
      planted_at TEXT NOT NULL DEFAULT (datetime('now')),
      watered_at TEXT DEFAULT ''
    );

    -- 花园道具库存（孩子：肥料袋等）
    CREATE TABLE IF NOT EXISTS garden_inventory (
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      item_key TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (child_id, item_key)
    );

    -- 学习计划（家长为孩子配置的周计划）
    CREATE TABLE IF NOT EXISTS study_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      weekday INTEGER NOT NULL DEFAULT 0,  -- 0=每天, 1-7=周一~周日
      title TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT 'study',
      duration_min INTEGER NOT NULL DEFAULT 30,
      points INTEGER NOT NULL DEFAULT 10,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 学习计划完成打卡（孩子每日完成记录）
    CREATE TABLE IF NOT EXISTS study_plan_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      done_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(plan_id, child_id, done_date)
    );

    -- 奖励商品（家长配置）
    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      cost INTEGER NOT NULL DEFAULT 50,
      icon TEXT NOT NULL DEFAULT '🎁',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 兑换记录
    CREATE TABLE IF NOT EXISTS reward_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
      claimed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 勋章定义
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '🏅',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 孩子获得的勋章
    CREATE TABLE IF NOT EXISTS child_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
      earned_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 错题本
    CREATE TABLE IF NOT EXISTS wrong_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      subject TEXT NOT NULL DEFAULT '数学',
      question TEXT NOT NULL,
      wrong_answer TEXT DEFAULT '',
      correct_answer TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 登录会话
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      user_type TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL
    );

    -- 企业级索引（大数据量查询加速）
    CREATE INDEX IF NOT EXISTS idx_tasks_child_status ON tasks(child_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_diaries_child ON diaries(child_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_pomodoro_child ON pomodoro_sessions(child_id, completed_at);
    CREATE INDEX IF NOT EXISTS idx_garden_child ON garden_plants(child_id);
    CREATE INDEX IF NOT EXISTS idx_pets_child ON pets(child_id);
    CREATE INDEX IF NOT EXISTS idx_child_badges_child ON child_badges(child_id);
    CREATE INDEX IF NOT EXISTS idx_wrong_child ON wrong_questions(child_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_claims_child ON reward_claims(child_id);
    CREATE INDEX IF NOT EXISTS idx_rewards_parent ON rewards(parent_id);
    CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
  `);

  // 迁移：exercises 元信息字段
  addColumnIfMissing(db, "exercises", "difficulty", "INTEGER DEFAULT 2");
  addColumnIfMissing(db, "exercises", "topic", "TEXT DEFAULT ''");
  addColumnIfMissing(db, "exercises", "from_wrong", "INTEGER DEFAULT 0");
  // 迁移：garden_plants.plot_index（新增字段）
  addColumnIfMissing(db, "garden_plants", "plot_index", "INTEGER DEFAULT -1");
  // 迁移：garden_plants.harvested 字段（收获闭环）
  addColumnIfMissing(db, "garden_plants", "harvested", "INTEGER DEFAULT 0");
  addColumnIfMissing(db, "garden_plants", "harvested_at", "TEXT DEFAULT ''");
  // 迁移：study_plans 旧库补充（防手改库缺列）
  addColumnIfMissing(db, "study_plans", "weekday", "INTEGER DEFAULT 0");
  addColumnIfMissing(db, "study_plans", "subject", "TEXT DEFAULT 'study'");
  addColumnIfMissing(db, "study_plans", "duration_min", "INTEGER DEFAULT 30");
  addColumnIfMissing(db, "study_plans", "points", "INTEGER DEFAULT 10");
  addColumnIfMissing(db, "study_plans", "active", "INTEGER DEFAULT 1");
}

function addColumnIfMissing(
  db: DatabaseSync,
  table: string,
  column: string,
  def: string
) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  }
}

/** 事务包装：出错自动回滚，成功提交 */
export function withTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
