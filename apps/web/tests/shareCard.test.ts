import { describe, expect, it } from 'vitest';
import {
  CARD_H,
  CARD_W,
  fitTextWithEllipsis,
  isEmojiLike,
  renderShareCard,
  splitTextRuns,
  wrapBodyText,
} from '../lib/shareCard';

interface Call {
  type: string;
  text?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  font?: string;
}

/** 轻量假 canvas 上下文：按字符宽度模拟测量，记录绘制调用 */
function createFakeCtx(charWidth = 34) {
  const calls: Call[] = [];
  const state: Record<string, unknown> = {};
  const measureText = (text: string) => ({
    width: [...text].reduce((sum, ch) => {
      if (ch === '…') return sum + 24;
      if (isEmojiLike(ch)) return sum + 30;
      const cp = ch.codePointAt(0) ?? 0;
      return sum + (cp > 0x2e80 ? charWidth : charWidth * 0.5);
    }, 0),
  });

  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      if (prop === 'measureText') return measureText;
      if (prop === 'createRadialGradient') return () => ({ addColorStop: () => {} });
      if (prop === 'fillText') {
        return (text: string, x: number, y: number) => {
          calls.push({ type: 'fillText', text, x, y, font: String(state.font ?? '') });
        };
      }
      if (prop === 'fillRect') {
        return (x: number, y: number, w: number, h: number) => calls.push({ type: 'fillRect', x, y, w, h });
      }
      if (prop === 'strokeRect') {
        return (x: number, y: number, w: number, h: number) => calls.push({ type: 'strokeRect', x, y, w, h });
      }
      if (
        typeof prop === 'string'
        && ['beginPath', 'closePath', 'moveTo', 'lineTo', 'arcTo', 'arc', 'fill', 'stroke', 'save', 'restore', 'translate', 'rotate', 'clip'].includes(prop)
      ) {
        return (...args: unknown[]) => calls.push({ type: prop, x: args[0] as number, y: args[1] as number });
      }
      return state[String(prop)];
    },
    set(_target, prop, value) {
      state[String(prop)] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

  return { ctx, calls };
}

describe('emoji 分段', () => {
  it('识别 emoji / 符号', () => {
    expect(isEmojiLike('🔥')).toBe(true);
    expect(isEmojiLike('👍')).toBe(true);
    expect(isEmojiLike('❤')).toBe(true);
    expect(isEmojiLike('★')).toBe(true);
    expect(isEmojiLike('辣')).toBe(false);
    expect(isEmojiLike('A')).toBe(false);
  });

  it('混合文本按字符拆分 runs', () => {
    expect(splitTextRuns('🔥燃')).toEqual([
      { text: '🔥', emoji: true },
      { text: '燃', emoji: false },
    ]);
    expect(splitTextRuns('A辣👍B')).toEqual([
      { text: 'A辣', emoji: false },
      { text: '👍', emoji: true },
      { text: 'B', emoji: false },
    ]);
  });
});

describe('省略号截断', () => {
  it('能放下时不加省略号', () => {
    const { ctx } = createFakeCtx(34);
    expect(fitTextWithEllipsis(ctx, '你好', 872)).toEqual({ text: '你好', ellipsis: false });
  });

  it('放不下时截断并保留省略号宽度', () => {
    const { ctx } = createFakeCtx(34);
    const result = fitTextWithEllipsis(ctx, '辣'.repeat(40), 872);
    expect(result.ellipsis).toBe(true);
    expect(result.text.length).toBe(24); // (872 - 24) / 34
    const width = ctx.measureText(result.text).width + ctx.measureText('…').width;
    expect(width).toBeLessThanOrEqual(872);
  });
});

describe('正文换行', () => {
  it('短文一行画完，不加省略号', () => {
    const { ctx, calls } = createFakeCtx(34);
    ctx.font = '400 34px "ZCOOL KuaiLe", sans-serif';
    const lines = wrapBodyText(ctx, '今晚太棒了', 104, 460, 872, 60, 9);
    expect(lines).toBe(1);
    const textCalls = calls.filter((call) => call.type === 'fillText');
    expect(textCalls).toHaveLength(1);
    expect(textCalls[0].text).toBe('今晚太棒了');
    expect(textCalls[0].font).toContain('ZCOOL');
  });

  it('超长文最多 maxLines 行，最后一行带金色省略号且不越界', () => {
    const { ctx, calls } = createFakeCtx(34);
    const lines = wrapBodyText(ctx, '辣'.repeat(300), 104, 460, 872, 60, 9);
    expect(lines).toBe(9);
    const textCalls = calls.filter((call) => call.type === 'fillText');
    // 9 行正文 + 1 次独立省略号
    expect(textCalls).toHaveLength(10);
    const ellipsisCall = textCalls.at(-1)!;
    expect(ellipsisCall.text).toBe('…');
    expect(ellipsisCall.y).toBeLessThanOrEqual(1000);
    const lastLine = textCalls.at(-2)!;
    expect(ctx.measureText(lastLine.text!).width + ctx.measureText('…').width).toBeLessThanOrEqual(872);
  });

  it('所有绘制 y 坐标都在画布内', () => {
    const { ctx, calls } = createFakeCtx(34);
    wrapBodyText(ctx, '辣'.repeat(500), 104, 460, 872, 60, 9);
    for (const call of calls) {
      if (call.type === 'fillText') {
        expect(call.y).toBeGreaterThanOrEqual(0);
        expect(call.y).toBeLessThanOrEqual(CARD_H);
      }
    }
  });
});

describe('renderShareCard 冒烟', () => {
  const longBody = '这是我追 ChiliChill 的第三年。'.repeat(40);

  const cases = [
    {
      mode: 'message',
      message: {
        author: '辣条不加辣',
        avatar: 1,
        mood: '🔥燃',
        rating: 5,
        body: longBody,
        cityTag: '上海',
        createdAt: Date.now(),
        imagesCount: 2,
        likesCount: 128,
        heartsCount: 36,
      },
    },
    {
      mode: 'page',
      title: '上海站日记',
      subtitle: '梅赛德斯-奔驰文化中心 / 2026-05-17',
      count: 3,
      stations: [{ cityName: '上海', palette: 'hot' }],
    },
    {
      mode: 'footprint',
      title: '我的巡演足迹',
      subtitle: '点亮 5 座城市 · 发了 12 篇日记',
      cityCount: 5,
      diaryCount: 12,
      stations: [{ cityName: '上海', palette: 'hot' }],
    },
  ];

  it('三种模式均不抛异常，二维码边框存在，坐标不越界', () => {
    for (const data of cases) {
      const { ctx, calls } = createFakeCtx(34);
      expect(() => renderShareCard(ctx, data as never)).not.toThrow();
      expect(calls.some((call) => call.type === 'strokeRect')).toBe(true);
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        if (call.type === 'fillText') {
          expect(call.y ?? 0).toBeGreaterThanOrEqual(0);
          expect(call.y ?? 0).toBeLessThanOrEqual(CARD_H);
        }
        if (call.type === 'fillRect' || call.type === 'strokeRect') {
          // 票根菱形装饰在 translate 后以 -6,-6 绘制，属于有意偏移
          const isRotatedDiamond = call.x === -6 && call.y === -6;
          expect(call.y ?? 0).toBeGreaterThanOrEqual(isRotatedDiamond ? -10 : 0);
          expect((call.y ?? 0) + (call.h ?? 0)).toBeLessThanOrEqual(CARD_H + 1);
          expect(call.x ?? 0).toBeGreaterThanOrEqual(isRotatedDiamond ? -10 : 0);
          expect((call.x ?? 0) + (call.w ?? 0)).toBeLessThanOrEqual(CARD_W + 1);
        }
      }
    }
  });
});
