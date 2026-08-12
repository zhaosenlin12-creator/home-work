// 专业 SVG 卡通图标库（替代 emoji）
// 心情脸 / 植物成长 / 通用装饰，手绘渐变卡通风格

export type MoodType = "happy" | "excited" | "calm" | "sad" | "angry";

const FACE_GRAD = {
  happy: { from: "#ffe082", to: "#ffd166" },
  excited: { from: "#ff9f8a", to: "#ff7a7a" },
  calm: { from: "#a0e8c8", to: "#8ee6c4" },
  sad: { from: "#a8d4f0", to: "#79d5ff" },
  angry: { from: "#ffb39a", to: "#ff8a65" },
};

export function MoodIcon({
  type,
  size = 40,
}: {
  type: MoodType;
  size?: number;
}) {
  const g = FACE_GRAD[type] ?? FACE_GRAD.happy;
  const gid = `mood-${type}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-label={type}
      className="inline-block"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={g.from} />
          <stop offset="100%" stopColor={g.to} />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill={`url(#${gid})`} />
      <circle cx="24" cy="24" r="21" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" />
      {/* 眼睛 */}
      {type === "happy" && (
        <>
          <path d="M14 21q5-5 10 0" stroke="#5d4e00" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M24 21q5-5 10 0" stroke="#5d4e00" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M17 30q7 6 14 0" stroke="#5d4e00" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </>
      )}
      {type === "excited" && (
        <>
          <circle cx="17" cy="21" r="2.6" fill="#5d4e00" />
          <circle cx="31" cy="21" r="2.6" fill="#5d4e00" />
          <path d="M15 29q9 8 18 0l-2 4q-7 5-14 0z" fill="#5d4e00" />
        </>
      )}
      {type === "calm" && (
        <>
          <path d="M15 21h5M28 21h5" stroke="#2e5c46" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M18 29q6 4 12 0" stroke="#2e5c46" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </>
      )}
      {type === "sad" && (
        <>
          <circle cx="17" cy="21" r="2.4" fill="#2c4a66" />
          <circle cx="31" cy="21" r="2.4" fill="#2c4a66" />
          <path d="M17 32q7-5 14 0" stroke="#2c4a66" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M34 12c0 3-2 3.4-2 5.6 0 1.1.9 2 2 2s2-.9 2-2c0-2.2-2-2.6-2-5.6z" fill="#79d5ff" />
        </>
      )}
      {type === "angry" && (
        <>
          <path d="M13 17l7 3M35 17l-7 3" stroke="#7a2e1d" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <circle cx="17" cy="22" r="2.2" fill="#7a2e1d" />
          <circle cx="31" cy="22" r="2.2" fill="#7a2e1d" />
          <path d="M17 30q7 4 14 0" stroke="#7a2e1d" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </>
      )}
    </svg>
  );
}

export type PlantType = "tree" | "sunflower" | "flower";

// 植物：stage 1-5 成长阶段
export function PlantIcon({
  type = "tree",
  stage = 1,
  size = 64,
}: {
  type?: PlantType;
  stage?: number;
  size?: number;
}) {
  const s = Math.max(1, Math.min(5, stage));
  const gid = `plant-${type}-${s}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label={`${type}-${s}`} className="inline-block">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8ee6c4" />
          <stop offset="100%" stopColor="#54d2a8" />
        </linearGradient>
      </defs>

      {type === "tree" && (
        <>
          {/* 土壤 */}
          <ellipse cx="32" cy="58" rx="16" ry="4" fill="#d9b48f" opacity="0.7" />
          {s === 1 && <circle cx="32" cy="52" r="4" fill="url(#gid)" />}
          {s === 2 && <path d="M32 56V46" stroke="#4e9e63" strokeWidth="2.6" strokeLinecap="round" />}
          {s >= 2 && <path d="M32 50c-6-2-10-6-12-10 5-1 10 0 12 4z" fill="url(#gid)" />}
          {s === 3 && (
            <>
              <path d="M32 56V40" stroke="#4e9e63" strokeWidth="3" strokeLinecap="round" />
              <path d="M32 44c-8-3-13-9-15-15 7-2 14 1 17 7z" fill="url(#gid)" />
              <path d="M32 44c8-3 13-9 15-15-7-2-14 1-17 7z" fill="#6fd8ad" />
            </>
          )}
          {s >= 4 && (
            <>
              <path d="M32 58V32" stroke="#7a5230" strokeWidth="4" strokeLinecap="round" />
              <path d="M32 38c-9-4-15-11-17-19 8-3 16 1 20 9z" fill="url(#gid)" />
              <path d="M32 38c9-4 15-11 17-19-8-3-16 1-20 9z" fill="#6fd8ad" />
              {s === 5 && (
                <>
                  <circle cx="22" cy="22" r="2.4" fill="#ffd166" />
                  <circle cx="42" cy="24" r="2.4" fill="#ffd166" />
                  <circle cx="32" cy="14" r="2.4" fill="#ffd166" />
                </>
              )}
            </>
          )}
        </>
      )}

      {type === "sunflower" && (
        <>
          <ellipse cx="32" cy="58" rx="16" ry="4" fill="#d9b48f" opacity="0.7" />
          {s === 1 && <circle cx="32" cy="52" r="4" fill="url(#gid)" />}
          {s === 2 && (
            <>
              <path d="M32 56V46" stroke="#4e9e63" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M32 50c-5-1-8-4-10-7 4-1 8 0 10 3z" fill="url(#gid)" />
            </>
          )}
          {s === 3 && (
            <>
              <path d="M32 56V40" stroke="#4e9e63" strokeWidth="3" strokeLinecap="round" />
              <path d="M32 46c-7-2-11-6-13-10 5-2 10 0 13 4z" fill="url(#gid)" />
              <path d="M32 46c7-2 11-6 13-10-5-2-10 0-13 4z" fill="#6fd8ad" />
            </>
          )}
          {s >= 4 && (
            <>
              <path d="M32 58V42" stroke="#4e9e63" strokeWidth="3" strokeLinecap="round" />
              <circle cx="32" cy="34" r={s === 5 ? 13 : 10} fill="#ffd166" stroke="#ffb347" strokeWidth="2" />
              <circle cx="32" cy="34" r={s === 5 ? 6 : 5} fill="#7a5230" />
              {s === 5 &&
                [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                  <ellipse
                    key={a}
                    cx={32 + 13 * Math.cos((a * Math.PI) / 180) * 1.15}
                    cy={34 + 13 * Math.sin((a * Math.PI) / 180) * 1.15}
                    rx="3.4"
                    ry="6"
                    fill="#ffd166"
                    transform={`rotate(${a} ${32 + 13 * Math.cos((a * Math.PI) / 180) * 1.15} ${34 + 13 * Math.sin((a * Math.PI) / 180) * 1.15})`}
                  />
                ))}
            </>
          )}
        </>
      )}

      {type === "flower" && (
        <>
          <ellipse cx="32" cy="58" rx="16" ry="4" fill="#d9b48f" opacity="0.7" />
          {s === 1 && <circle cx="32" cy="52" r="4" fill="url(#gid)" />}
          {s === 2 && (
            <>
              <path d="M32 56V46" stroke="#4e9e63" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M32 50c-5-1-8-4-10-7 4-1 8 0 10 3z" fill="url(#gid)" />
            </>
          )}
          {s === 3 && (
            <>
              <path d="M32 56V42" stroke="#4e9e63" strokeWidth="3" strokeLinecap="round" />
              <circle cx="32" cy="38" r="6" fill="#ffb3d9" />
            </>
          )}
          {s >= 4 && (
            <>
              <path d="M32 58V40" stroke="#4e9e63" strokeWidth="3" strokeLinecap="round" />
              <path d="M32 50c-5-1-8-3-11-6 4-2 8-1 11 2z" fill="url(#gid)" />
              <path d="M32 50c5-1 8-3 11-6-4-2-8-1-11 2z" fill="#6fd8ad" />
              {/* 花瓣 */}
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <ellipse
                  key={a}
                  cx={32 + 8 * Math.cos((a * Math.PI) / 180)}
                  cy={34 + 8 * Math.sin((a * Math.PI) / 180)}
                  rx="4.6"
                  ry="7"
                  fill={s === 5 ? "#ff8fd7" : "#ffb3d9"}
                  transform={`rotate(${a} ${32} ${34})`}
                />
              ))}
              <circle cx="32" cy="34" r="4.4" fill="#ffd166" />
            </>
          )}
        </>
      )}
    </svg>
  );
}

// 品牌 logo：卡通树（替代 🌲）
export function LogoTree({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="logo" className="inline-block">
      <defs>
        <linearGradient id="logo-tree" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8ee6c4" />
          <stop offset="100%" stopColor="#4ecdc4" />
        </linearGradient>
      </defs>
      <path d="M32 4c-10 12-18 20-18 30 0 9 7 16 18 16s18-7 18-16c0-10-8-18-18-30z" fill="url(#logo-tree)" />
      <circle cx="24" cy="30" r="2.6" fill="#fff" opacity="0.85" />
      <circle cx="40" cy="34" r="2.2" fill="#fff" opacity="0.7" />
      <path d="M32 50c-3 3-4 5-4 8h8c0-3-1-5-4-8z" fill="#7a5230" />
      <path d="M32 46l4 5h-8z" fill="#54d2a8" />
    </svg>
  );
}