// DeepSeek 调用封装（可扩展：换 provider 只需改这里）
const API_URL = "https://api.deepseek.com/chat/completions";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function callDeepSeek(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {}
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("未配置 DEEPSEEK_API_KEY");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      max_tokens: opts.maxTokens ?? 800,
      temperature: opts.temperature ?? 0.7,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
  });
  if (!res.ok) {
    throw new Error(`AI 服务错误 ${res.status}`);
  }
  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error("AI 无返回");
  return reply;
}

/** 从 AI 回复中提取 JSON（容忍 markdown 代码块包裹） */
export function extractJson<T>(text: string): T | null {
  const trimmed = text.trim();
  // 去掉 ```json ... ``` 包裹
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const target = fence ? fence[1] : trimmed;
  // 找到第一个 { 到最后一个 }
  const start = target.indexOf("{");
  const end = target.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(target.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}