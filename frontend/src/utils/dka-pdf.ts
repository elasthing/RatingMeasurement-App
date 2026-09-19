// PDF batch reports for the Rating DKA module. `@page { margin: 0 }` removes the
// browser print header/footer (URL/date). Each batch = one page with a summary
// table of its (up to 4) samples + sample thumbnails.

import { DkaRecord, fileUrl, imageToDataUri } from "@/src/api";
import { fmtDate, fmtDateTime } from "@/src/utils/format";

export { printHtmlOnWeb, sharePdfNative } from "@/src/utils/pdf-report";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textOn(color: string): string {
  const h = color.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0A1420" : "#FFFFFF";
}

function commonStyles(): string {
  return `
    @page { margin: 0; size: A4; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0A1420; margin: 0; padding: 0; }
    .page { padding: 40px 32px; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    h1 { margin: 0; font-size: 22px; }
    .sub { color: #1d4ed8; font-size: 11px; letter-spacing: 1.2px; font-weight: 700; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-weight: bold; font-size: 11px; border: 1px solid rgba(0,0,0,.15); }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    td, th { padding: 8px 6px; border-bottom: 1px solid #e5e7eb; font-size: 12px; text-align: left; }
    th { font-size: 10px; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
    .thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 14px; }
    .thumb { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .thumb img { width: 100%; height: 150px; object-fit: cover; display: block; }
    .thumb .cap { padding: 6px; font-size: 10px; color: #374151; text-align: center; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin-top: 10px; }
    .meta-grid div { font-size: 11px; color: #374151; padding: 4px 0; border-bottom: 1px solid #eef2f7; }
    .meta-grid span { color: #64748b; margin-right: 6px; }
  `;
}

async function embed(path?: string): Promise<string> {
  const url = fileUrl(path || "");
  if (!url) return "";
  const data = await imageToDataUri(url);
  return data || url;
}

async function renderBatch(rec: DkaRecord): Promise<string> {
  const imgs = await Promise.all(rec.samples.map((s) => embed(s.crop_path)));
  const rows = rec.samples
    .map(
      (s) => `<tr>
        <td>#${s.index}</td>
        <td>${esc(s.sample_id || "—")}</td>
        <td><span class="badge" style="background:${esc(s.color)};color:${textOn(s.color)}">${esc(s.rating)}</span></td>
        <td>${s.confidence.toFixed(0)}%</td>
        <td>${esc(s.summary || "—")}</td>
      </tr>`,
    )
    .join("");
  const thumbs = rec.samples
    .map((s, i) => `<div class="thumb"><img src="${esc(imgs[i])}"/><div class="cap">#${s.index} · ${esc(s.sample_id || "—")} · ${esc(s.rating)}</div></div>`)
    .join("");
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #e5e7eb;padding-bottom:8px">
        <div>
          <div class="sub">RATING DKA · BATCH REPORT</div>
          <h1>${esc(rec.meta.batch_id || rec.id.slice(0, 8))}</h1>
        </div>
        <div style="text-align:right;font-size:10px;color:#64748b">${esc(fmtDateTime(rec.created_at))}<br/>${rec.samples.length} sampel</div>
      </div>

      <table>
        <thead><tr><th>#</th><th>Sample ID</th><th>Rating</th><th>Conf</th><th>Deskripsi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="thumbs">${thumbs}</div>

      <div class="meta-grid">
        <div><span>Batch ID</span>${esc(rec.meta.batch_id || "—")}</div>
        <div><span>Product</span>${esc(rec.meta.product || "—")}</div>
        <div><span>Operator</span>${esc(rec.meta.operator || "—")}</div>
        <div><span>Condition</span>${rec.meta.temperature_c}&deg;C · ${rec.meta.duration_hours}h</div>
        <div><span>AI Model</span>${esc(rec.ai_model)}</div>
        <div><span>Tanggal</span>${esc(fmtDate(rec.created_at))}</div>
      </div>
    </div>
  `;
}

export async function buildDkaSingleHtml(rec: DkaRecord): Promise<string> {
  const page = await renderBatch(rec);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>DKA Batch Report ${esc(rec.meta.batch_id || rec.id)}</title>
    <style>${commonStyles()}</style>
  </head><body>${page}</body></html>`;
}

export async function buildDkaCombinedHtml(records: DkaRecord[]): Promise<string> {
  const pages = (await Promise.all(records.map(renderBatch))).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>DKA Combined Batch Report</title>
    <style>${commonStyles()}</style>
  </head><body>${pages}</body></html>`;
}
