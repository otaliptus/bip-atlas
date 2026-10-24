import { useEffect, useState } from "preact/hooks";
import { figureShareUrl, type FigureViewValues } from "./share";

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {}
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.readOnly = true;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  if (!copied) throw new Error("Copy was unavailable");
}

export function ShareView({ figureId, values }: { figureId: string; values: FigureViewValues }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [url, setUrl] = useState("");
  const serialized = JSON.stringify(values);
  useEffect(() => { setStatus("idle"); setUrl(""); }, [serialized]);

  const share = async () => {
    const next = figureShareUrl(window.location.href, figureId, values);
    setUrl(next);
    try {
      await copyText(next);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div class="atlas-share">
      <button type="button" class="atlas-scrub__btn atlas-share__button" onClick={share}>{status === "copied" ? "View copied" : "Copy this view"}</button>
      {status === "copied" ? <span class="atlas-share__status" role="status">Exact figure state, ready to share.</span> : null}
      {status === "failed" ? (
        <label class="atlas-share__fallback">
          <span>Copy this exact view manually</span>
          <input type="text" readOnly value={url} aria-label="Shareable URL for this figure" onFocus={(event) => event.currentTarget.select()} />
        </label>
      ) : null}
    </div>
  );
}
