import { NextResponse } from "next/server";
import { requireChild } from "@/lib/auth";

// AI 助教：POST /api/ai/chat  { message, history? }
// DeepSeek API；未配置 key 时返回引导提示（不阻塞本地体验）
export async function POST(request: Request) {
  const user = await requireChild();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: { message?: string; history?: { role: string; content: string }[] };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "消息不能为空" }, { status: 400 });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply:
        "嗨，我是小森的学习助手！现在还没有接入 AI 大脑（需要在 .env 里配置 DEEPSEEK_API_KEY）。不过我可以陪你聊聊学习计划：你可以告诉我今天想学什么，我会帮你把任务拆成小目标。",
    });
  }

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "你是小学生森霖的学习助手，说话亲切、简短、鼓励为主。用简体中文回答，多用表情符号。",
          },
          ...(body.history || []).slice(-8),
          { role: "user", content: message },
        ],
        max_tokens: 500,
      }),
      // 企业级：15s 超时，防止上游挂起拖死请求
      signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      return NextResponse.json({ reply: "哎呀，AI 暂时没回应，稍后再试试吧～" });
    }
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("AI error", e);
    return NextResponse.json(
      { reply: "网络开小差了，稍后再试试吧～" },
      { status: 502 }
    );
  }
}
