"use client";

import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";

/**
 * 局域网访问二维码
 *
 * 显示当前服务地址（http://电脑IP:端口）的二维码，
 * 手机扫码立即进入应用 —— 免去手输链接。
 * 扫码后用浏览器打开 → 添加到主屏幕，即可获得接近 App 的体验。
 */
export default function LanQRCode({
  size = 180,
  showText = true,
}: {
  size?: number;
  showText?: boolean;
}) {
  const [svg, setSvg] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    const host = window.location.hostname;
    const port = window.location.port || "3101";
    const u = `http://${host}:${port}`;
    setUrl(u);
    let cancelled = false;
    import("qrcode-generator")
      .then((m) => {
        const qrcode = m.default || m;
        const qr = qrcode(0, "M");
        qr.addData(u);
        qr.make();
        if (!cancelled) setSvg(qr.createSvgTag({ cellSize: 4, margin: 10, scalable: true }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-2xl bg-white p-3 shadow-card" style={{ width: size + 24 }}>
        {svg ? (
          <div
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{ width: size, height: size }}
            className="mx-auto"
          />
        ) : (
          <div
            className="mx-auto flex items-center justify-center text-ink-soft/50"
            style={{ width: size, height: size }}
          >
            <QrCode size={48} />
          </div>
        )}
      </div>
      {showText && (
        <div className="text-center">
          <div className="text-xs text-ink-soft">手机扫码，立即进入</div>
          {url && (
            <div className="text-[11px] text-mint-dark font-mono mt-0.5 break-all">{url}</div>
          )}
        </div>
      )}
    </div>
  );
}
