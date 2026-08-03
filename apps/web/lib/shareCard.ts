/**
 * ChiliChill 分享卡渲染 —— 纯 Canvas 绘制。
 * 视觉方向：巡演海报 / 门票。深紫墨底 + 舞台光晕 + 金/青双色字标。
 */

import qrcode from './qrcode-generator';

export type ShareCardMode = 'page' | 'footprint' | 'message';
export type SharePalette = 'hot' | 'cool' | 'gold' | 'violet' | 'green' | 'warn';

export interface ShareCardStation {
  cityName: string;
  palette: SharePalette;
}

export interface ShareCardData {
  mode: ShareCardMode;
  qrUrl?: string;
  message?: {
    author: string;
    avatar: number;
    mood: string;
    rating: number;
    body: string;
    cityTag: string;
    createdAt: number;
    imagesCount: number;
    likesCount: number;
    heartsCount: number;
  };
  title?: string;
  subtitle?: string;
  count?: number;
  cityCount?: number;
  diaryCount?: number;
  stations?: ShareCardStation[];
}

export const CARD_W = 1080;
export const CARD_H = 1440;

const INK = '#f6eeda';
const DIM = '#b9aed4';
const GOLD = '#ffd23f';
const TEAL = '#37d7e2';
const HOT = '#ff4d6d';

const PALETTE: Record<SharePalette, string> = {
  hot: '#ff4d6d',
  cool: '#37d7e2',
  gold: '#ffd23f',
  violet: '#b388ff',
  green: '#7cf28a',
  warn: '#ff9f43',
};

const AVATAR_COLORS = ['#ffd23f', '#ff4d6d', '#37d7e2', '#7cf28a', '#b388ff', '#ff9f43'];
const EMOJI_FAMILIES = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const SYMBOL_FONT = '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/* ===== 按字符回退的文本绘制（emoji / 符号用系统字体） ===== */
export function isEmojiLike(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return cp === 0xfe0f
    || (cp >= 0x1f000 && cp <= 0x1faff)
    || (cp >= 0x2600 && cp <= 0x27bf)
    || (cp >= 0x2b00 && cp <= 0x2bff);
}

export function splitTextRuns(text: string): Array<{ text: string; emoji: boolean }> {
  const runs: Array<{ text: string; emoji: boolean }> = [];
  for (const ch of text) {
    const emoji = isEmojiLike(ch);
    const last = runs[runs.length - 1];
    if (last && last.emoji === emoji) {
      last.text += ch;
    } else {
      runs.push({ text: ch, emoji });
    }
  }
  return runs;
}

function emojiFontFor(baseFont: string): string {
  const sizeMatch = baseFont.match(/(\d+(?:\.\d+)?px)/);
  return `${sizeMatch ? sizeMatch[1] : '28px'} ${EMOJI_FAMILIES}`;
}

export function measureTextRuns(ctx: CanvasRenderingContext2D, runs: Array<{ text: string; emoji: boolean }>, baseFont: string): number {
  let width = 0;
  for (const run of runs) {
    ctx.font = run.emoji ? emojiFontFor(baseFont) : baseFont;
    width += ctx.measureText(run.text).width;
  }
  return width;
}

export function drawTextRuns(ctx: CanvasRenderingContext2D, runs: Array<{ text: string; emoji: boolean }>, x: number, y: number, baseFont: string) {
  let cursor = x;
  for (const run of runs) {
    ctx.font = run.emoji ? emojiFontFor(baseFont) : baseFont;
    ctx.fillText(run.text, cursor, y);
    cursor += ctx.measureText(run.text).width;
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/* ===== 真实二维码（qrcode-generator，MIT） ===== */
function drawQR(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, text: string) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const cell = Math.floor(size / count);
  const offsetX = x + Math.floor((size - cell * count) / 2);
  const offsetY = y + Math.floor((size - cell * count) / 2);

  ctx.fillStyle = '#f6eeda';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#0a0616';
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) ctx.fillRect(offsetX + col * cell, offsetY + row * cell, cell, cell);
    }
  }
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, size, size);
}

/* ===== 文字自动换行（超长时最后一行以省略号收尾） ===== */
export function fitTextWithEllipsis(ctx: CanvasRenderingContext2D, text: string, maxW: number): { text: string; ellipsis: boolean } {
  const ellipsis = '…';
  const ellipsisWidth = ctx.measureText(ellipsis).width;
  let fit = '';
  for (const c of [...text]) {
    const next = fit + c;
    if (ctx.measureText(next).width + ellipsisWidth > maxW) break;
    fit = next;
  }
  if (fit === text) return { text, ellipsis: false };
  return { text: fit, ellipsis: true };
}

/**
 * 换行绘制正文，最多 maxLines 行；返回实际绘制行数。
 * 若文字被截断，最后一行末尾绘制金色省略号。
 */
export function wrapBodyText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines: number): number {
  const chars = [...text];
  let line = '';
  let lines = 0;
  for (const c of chars) {
    const next = line + c;
    if (ctx.measureText(next).width > maxW && line) {
      if (lines === maxLines - 1) {
        // 最后一行：放不下更多内容时截断并加省略号
        const fitted = fitTextWithEllipsis(ctx, line, maxW);
        ctx.fillText(fitted.text, x, y + lines * lineH);
        if (fitted.ellipsis) {
          ctx.fillStyle = GOLD;
          ctx.fillText('…', x + ctx.measureText(fitted.text).width, y + lines * lineH);
          ctx.fillStyle = INK;
        }
        return lines + 1;
      }
      ctx.fillText(line, x, y + lines * lineH);
      line = c;
      lines++;
    } else {
      line = next;
    }
  }
  if (line && lines < maxLines) {
    ctx.fillText(line, x, y + lines * lineH);
    lines++;
  }
  return lines;
}

/* ===== 背景：舞台光晕 + 星点 + 暗角 ===== */
function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#0a0616';
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const stageGlow = ctx.createRadialGradient(540, -140, 0, 540, -140, 900);
  stageGlow.addColorStop(0, 'rgba(122,80,214,0.42)');
  stageGlow.addColorStop(0.55, 'rgba(46,30,92,0.20)');
  stageGlow.addColorStop(1, 'rgba(10,6,22,0)');
  ctx.fillStyle = stageGlow;
  ctx.fillRect(0, 0, CARD_W, 760);

  const cornerGlow = ctx.createRadialGradient(990, 1300, 0, 990, 1300, 620);
  cornerGlow.addColorStop(0, 'rgba(55,215,226,0.10)');
  cornerGlow.addColorStop(1, 'rgba(10,6,22,0)');
  ctx.fillStyle = cornerGlow;
  ctx.fillRect(0, 720, CARD_W, CARD_H - 720);

  let seed = 20260803;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  ctx.fillStyle = '#f6eeda';
  for (let i = 0; i < 90; i++) {
    const sx = 44 + rnd() * 992;
    const sy = 34 + rnd() * 620;
    const sr = rnd() > 0.85 ? 2 : 1;
    ctx.globalAlpha = 0.10 + rnd() * 0.22;
    ctx.fillRect(sx, sy, sr, sr);
  }
  ctx.globalAlpha = 1;

  const vignette = ctx.createRadialGradient(540, 720, 320, 540, 720, 1100);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.40)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
}

/* ===== 海报外框 + 四角刻度 ===== */
function drawPosterFrame(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = 'rgba(246,238,218,0.14)';
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, 40, 40, CARD_W - 80, CARD_H - 80, 26);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,210,63,0.26)';
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, 52, 52, CARD_W - 104, CARD_H - 104, 18);
  ctx.stroke();

  const tick = 13;
  const ox = 44;
  const oy = 44;
  ctx.fillStyle = GOLD;
  // 左上
  ctx.fillRect(ox, oy, tick, 3);
  ctx.fillRect(ox, oy, 3, tick);
  // 右上
  ctx.fillRect(CARD_W - ox - tick, oy, tick, 3);
  ctx.fillRect(CARD_W - ox - 3, oy, 3, tick);
  // 左下
  ctx.fillRect(ox, CARD_H - oy - 3, tick, 3);
  ctx.fillRect(ox, CARD_H - oy - tick, 3, tick);
  // 右下
  ctx.fillRect(CARD_W - ox - tick, CARD_H - oy - 3, tick, 3);
  ctx.fillRect(CARD_W - ox - 3, CARD_H - oy - tick, 3, tick);
}

/* ===== 双色字标 + 小标签 ===== */
function drawWordmark(ctx: CanvasRenderingContext2D) {
  ctx.font = '400 44px "Press Start 2P", monospace';
  const w1 = ctx.measureText('CHILI').width;
  const w2 = ctx.measureText('CHILL').width;
  const x0 = (CARD_W - (w1 + 6 + w2)) / 2;
  ctx.fillStyle = GOLD;
  ctx.fillText('CHILI', x0, 118);
  ctx.fillStyle = TEAL;
  ctx.fillText('CHILL', x0 + w1 + 6, 118);

  ctx.font = '400 15px "Press Start 2P", monospace';
  ctx.fillStyle = DIM;
  ctx.textAlign = 'center';
  ctx.fillText('T O U R   D I A R Y', CARD_W / 2, 160);
  ctx.textAlign = 'left';
}

/* ===== 像素虚线分隔 ===== */
function drawDivider(ctx: CanvasRenderingContext2D, y: number, alpha = 0.30) {
  ctx.fillStyle = `rgba(255,210,63,${alpha})`;
  for (let x = 96; x < CARD_W - 96; x += 16) {
    ctx.fillRect(x, y, 9, 2);
  }
  ctx.save();
  ctx.translate(CARD_W / 2, y + 1);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = GOLD;
  ctx.fillRect(-6, -6, 12, 12);
  ctx.restore();
}

/* ===== 星星评分 ===== */
function drawStars(ctx: CanvasRenderingContext2D, rating: number, x: number, y: number, size = 28) {
  const safe = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  ctx.font = `${size}px ${SYMBOL_FONT}`;
  const filled = '★'.repeat(safe);
  const empty = '☆'.repeat(5 - safe);
  ctx.fillStyle = GOLD;
  ctx.fillText(filled, x, y);
  ctx.fillStyle = 'rgba(246,238,218,0.30)';
  ctx.fillText(empty, x + ctx.measureText(filled).width + 6, y);
}

/* ===== 圆角标签（chip） ===== */
function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill: string; stroke?: string; text?: string; color?: string; font?: string; radius?: number },
) {
  roundRectPath(ctx, x, y, w, h, opts.radius ?? h / 2);
  ctx.fillStyle = opts.fill;
  ctx.fill();
  if (opts.stroke) {
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  if (opts.text) {
    const baseFont = opts.font ?? '400 26px "ZCOOL KuaiLe", sans-serif';
    ctx.fillStyle = opts.color ?? INK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    drawTextRuns(ctx, splitTextRuns(opts.text), x + 22, y + h / 2 + 1, baseFont);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

/* ===== 城市贴片 ===== */
function drawStationChips(ctx: CanvasRenderingContext2D, stations: ShareCardStation[], y0: number) {
  if (!stations.length) return;
  const font = '400 26px "ZCOOL KuaiLe", sans-serif';
  ctx.font = font;
  let x = 104;
  let y = y0;
  const maxRight = CARD_W - 104;
  for (const station of stations.slice(0, 9)) {
    const color = PALETTE[station.palette];
    const tw = ctx.measureText(station.cityName).width;
    const w = 52 + tw + 30;
    if (x + w > maxRight && x > 104) {
      x = 104;
      y += 74;
    }
    roundRectPath(ctx, x, y, w, 56, 28);
    ctx.fillStyle = hexToRgba(color, 0.12);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(color, 0.45);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 26, y + 28, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = font;
    ctx.fillStyle = INK;
    ctx.textBaseline = 'middle';
    ctx.fillText(station.cityName, x + 46, y + 28 + 1);
    x += w + 16;
  }
  ctx.textBaseline = 'alphabetic';
}

/* ===== 头像 ===== */
function drawAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, avatarIndex: number, initial: string) {
  const color = AVATAR_COLORS[Math.abs(avatarIndex) % AVATAR_COLORS.length];
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(color, 0.16);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(color, 0.65);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '400 32px "ZCOOL KuaiLe", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, x, y + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function formatMessageTime(ts: number): string {
  const date = new Date(ts);
  const day = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time}`;
}

/* ===== 消息卡片 ===== */
function renderMessageCard(ctx: CanvasRenderingContext2D, data: NonNullable<ShareCardData['message']>) {
  // 作者 + 头像
  drawAvatar(ctx, 136, 300, 36, data.avatar, data.author[0] ?? '?');
  ctx.font = '400 44px "ZCOOL KuaiLe", sans-serif';
  ctx.fillStyle = INK;
  ctx.fillText(`@${data.author}`, 192, 292);
  ctx.font = '400 24px "ZCOOL KuaiLe", sans-serif';
  ctx.fillStyle = DIM;
  ctx.fillText(`${data.cityTag} · ${formatMessageTime(data.createdAt)}`, 192, 334);

  // 心情 + 评分
  const moodBaseFont = '400 28px "ZCOOL KuaiLe", sans-serif';
  const moodText = `${data.mood}`;
  const moodWidth = measureTextRuns(ctx, splitTextRuns(moodText), moodBaseFont);
  drawChip(ctx, 100, 368, moodWidth + 44, 46, {
    fill: hexToRgba(HOT, 0.13),
    stroke: hexToRgba(HOT, 0.5),
    text: moodText,
    color: '#ff8ba0',
    font: moodBaseFont,
  });
  drawStars(ctx, data.rating, 100 + moodWidth + 44 + 28, 401, 28);

  // 正文
  const bodyFont = 34;
  const bodyLineH = 60;
  const bodyX = 104;
  const bodyW = CARD_W - 208;
  const bodyTop = 460;
  const bodyBottomLimit = 1000; // 正文区域下界，避免压到照片/互动贴片
  const maxBodyLines = Math.max(3, Math.floor((bodyBottomLimit - bodyTop) / bodyLineH));
  ctx.font = `400 ${bodyFont}px "ZCOOL KuaiLe", sans-serif`;
  ctx.fillStyle = INK;
  const bodyLines = wrapBodyText(ctx, data.body, bodyX, bodyTop, bodyW, bodyLineH, maxBodyLines);

  // 照片 / 互动贴片
  const chipsY = bodyTop + bodyLines * bodyLineH + 16;
  const reactionChips: Array<{ icon: string; label: string; color: string; bg: string; stroke: string }> = [];
  if (data.imagesCount > 0) {
    reactionChips.push({ icon: '📷', label: `${data.imagesCount} 张现场照片`, color: GOLD, bg: hexToRgba(GOLD, 0.12), stroke: hexToRgba(GOLD, 0.45) });
  }
  reactionChips.push({ icon: '👍', label: `${data.likesCount}`, color: '#a6f7b0', bg: 'rgba(124,242,138,0.12)', stroke: 'rgba(124,242,138,0.45)' });
  reactionChips.push({ icon: '❤️', label: `${data.heartsCount}`, color: '#ff8ba0', bg: hexToRgba(HOT, 0.12), stroke: hexToRgba(HOT, 0.45) });

  const chipBaseFont = '400 26px "ZCOOL KuaiLe", sans-serif';
  let chipX = 104;
  for (const chip of reactionChips) {
    const text = `${chip.icon} ${chip.label}`;
    const tw = measureTextRuns(ctx, splitTextRuns(text), chipBaseFont);
    const w = tw + 44;
    drawChip(ctx, chipX, chipsY, w, 44, {
      fill: chip.bg,
      stroke: chip.stroke,
      text,
      color: chip.color,
      font: chipBaseFont,
    });
    chipX += w + 16;
  }
}

/* ===== 页面 / 足迹卡片 ===== */
function renderStatCard(ctx: CanvasRenderingContext2D, data: ShareCardData) {
  ctx.font = '400 66px "ZCOOL KuaiLe", sans-serif';
  ctx.fillStyle = INK;
  ctx.fillText(data.title ?? '巡演日记', 100, 288);

  ctx.font = '400 28px "ZCOOL KuaiLe", sans-serif';
  ctx.fillStyle = DIM;
  ctx.fillText(data.subtitle ?? '', 100, 338);
  drawDivider(ctx, 374, 0.22);

  if (data.mode === 'footprint') {
    const cityCount = data.cityCount ?? 0;
    const diaryCount = data.diaryCount ?? 0;
    if (cityCount === 0 && diaryCount === 0) {
      ctx.font = '400 32px "ZCOOL KuaiLe", sans-serif';
      ctx.fillStyle = DIM;
      ctx.fillText('写下第一篇日记后点亮城市', 104, 600);
    } else {
      ctx.font = '400 130px "Press Start 2P", monospace';
      ctx.fillStyle = GOLD;
      ctx.fillText(String(cityCount), 104, 588);
      ctx.font = '400 30px "ZCOOL KuaiLe", sans-serif';
      ctx.fillStyle = DIM;
      ctx.fillText('座城市', 112, 644);

      ctx.font = '400 130px "Press Start 2P", monospace';
      ctx.fillStyle = TEAL;
      ctx.fillText(String(diaryCount), 448, 588);
      ctx.font = '400 30px "ZCOOL KuaiLe", sans-serif';
      ctx.fillStyle = DIM;
      ctx.fillText('篇日记', 456, 644);
    }
  } else {
    const count = data.count ?? 0;
    ctx.font = '400 190px "Press Start 2P", monospace';
    ctx.fillStyle = GOLD;
    const numW = ctx.measureText(String(count)).width;
    ctx.fillText(String(count), 100, 664);

    ctx.font = '400 38px "ZCOOL KuaiLe", sans-serif';
    ctx.fillStyle = DIM;
    const labelX = 100 + numW + 26;
    ctx.fillText('篇', labelX, 600);
    ctx.fillText('现场日记', labelX, 662);
  }

  drawStationChips(ctx, data.stations ?? [], 720);
}

/* ===== 票根分隔 + 二维码区 + 页脚 ===== */
function renderFooter(ctx: CanvasRenderingContext2D, data: ShareCardData) {
  drawDivider(ctx, 1086, 0.22);

  // 白色二维码票块
  const qrX = 104;
  const qrY = 1134;
  const qrSize = 192;
  roundRectPath(ctx, qrX, qrY, qrSize, qrSize, 18);
  ctx.fillStyle = '#f7f2e9';
  ctx.fill();
  drawQR(ctx, qrX + 12, qrY + 12, qrSize - 24, data.qrUrl ?? 'https://www.707o.cc');

  ctx.font = '400 34px "ZCOOL KuaiLe", sans-serif';
  ctx.fillStyle = GOLD;
  ctx.fillText('扫码查看', 332, 1188);
  ctx.font = '400 30px "Press Start 2P", monospace';
  ctx.fillStyle = INK;
  ctx.fillText('www.707o.cc', 332, 1242);
  ctx.font = '400 22px "ZCOOL KuaiLe", sans-serif';
  ctx.fillStyle = DIM;
  ctx.fillText('长按识别 · 一起巡演', 332, 1284);

  ctx.font = '400 14px "Press Start 2P", monospace';
  ctx.fillStyle = 'rgba(177,160,204,0.50)';
  ctx.textAlign = 'center';
  ctx.fillText('CHILICHILL TOUR DIARY', CARD_W / 2, 1392);
  ctx.textAlign = 'left';
}

export function renderShareCard(ctx: CanvasRenderingContext2D, data: ShareCardData) {
  drawBackground(ctx);
  drawPosterFrame(ctx);
  drawWordmark(ctx);
  drawDivider(ctx, 196, 0.18);

  if (data.mode === 'message' && data.message) {
    renderMessageCard(ctx, data.message);
  } else {
    renderStatCard(ctx, data);
  }

  renderFooter(ctx, data);
}
