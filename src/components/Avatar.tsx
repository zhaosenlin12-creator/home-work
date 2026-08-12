type Props = {
  image?: string | null;
  emoji?: string;
  size?: number;
  rounded?: boolean;
  className?: string;
  alt?: string;
  /** 第二级 fallback：传孩子名时显示首字 */
  name?: string;
};

export default function Avatar({
  image,
  emoji,
  size = 64,
  rounded = true,
  className = "",
  alt = "avatar",
  name,
}: Props) {
  const hasImage = typeof image === "string" && image.trim() !== "";
  const hasEmoji = typeof emoji === "string" && emoji.trim() !== "";
  const style = { width: size, height: size };
  if (hasImage) {
    return (
      <img
        src={image}
        alt={alt}
        style={style}
        className={`object-cover ${rounded ? "rounded-2xl" : ""} bg-white shadow-card ${className}`}
      />
    );
  }
  if (hasEmoji) {
    return (
      <div
        style={style}
        className={`flex items-center justify-center ${rounded ? "rounded-2xl" : ""} bg-mint-soft shadow-card text-${size >= 80 ? "6xl" : size >= 48 ? "4xl" : "2xl"} ${className}`}
      >
        {emoji}
      </div>
    );
  }
  // 兜底：首位字符占位（避免空白头像）
  const ch = (name || alt || "?").trim().charAt(0) || "?";
  const fontSize = size * 0.45;
  return (
    <div
      style={style}
      className={`flex items-center justify-center ${rounded ? "rounded-2xl" : ""} bg-mint text-white font-extrabold shadow-card select-none ${className}`}
    >
      <span style={{ fontSize: Math.min(fontSize, size) }}>{ch}</span>
    </div>
  );
}
