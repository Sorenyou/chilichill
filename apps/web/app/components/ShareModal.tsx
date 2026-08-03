'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message } from '@chili/shared';
import { useApp } from '../store';
import { renderShareCard, type ShareCardData } from '@/lib/shareCard';

type ShareMode = 'page' | 'footprint' | 'message';

/* ===== 下载 ===== */
function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/* ===== 统计用户在留言与回复中的日记总数 ===== */
function countUserMessages(messages: Message[], username: string): number {
  let count = 0;
  for (const message of messages) {
    if (message.author === username) count++;
    if (message.replies?.length) count += countUserMessages(message.replies, username);
  }
  return count;
}

export function ShareModal() {
  const { shareOpen, setShareOpen, shareMode, shareTargetMessage, stations, messages, wallMode, curStation, footprintStationIds, user, showToast } = useApp();
  const [mode, setMode] = useState<ShareMode>(shareMode);
  const [generating, setGenerating] = useState(false);
  const closingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const footprintStations = stations.filter((s) => footprintStationIds.includes(s.id));
  const myMessagesCount = user ? countUserMessages(messages, user.username) : 0;

  useEffect(() => { setMode(shareMode); }, [shareMode]);

  const handleClose = useCallback(() => {
    closingRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { closingRef.current = false; setShareOpen(false); }, 250);
  }, [setShareOpen]);

  if (!shareOpen && !closingRef.current) return null;

  /* ===== 卡片内容计算 ===== */
  const title = mode === 'message' && shareTargetMessage
    ? `${shareTargetMessage.author}的现场日记`
    : mode === 'page'
      ? (wallMode === 'all' ? '全站巡演日记' : `${curStation?.cityName ?? '巡演'}站日记`)
      : `${user?.username ?? '我'}的巡演足迹`;

  const countText = mode === 'message' && shareTargetMessage
    ? `${shareTargetMessage.cityTag} · ${new Date(shareTargetMessage.createdAt).toLocaleDateString('zh-CN')}`
    : mode === 'page'
      ? `${messages.length} 篇现场日记`
      : `点亮 ${footprintStations.length} 座城市 · 发了 ${myMessagesCount} 篇日记`;

  /* ===== 生成 PNG ===== */
  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      await document.fonts.ready;
      try {
        await document.fonts.load('400 44px "Press Start 2P"');
        await document.fonts.load('400 34px "ZCOOL KuaiLe"');
      } catch { /* ignore */ }

      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1440;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas 2d context unavailable');

      const data: ShareCardData = mode === 'message' && shareTargetMessage
        ? {
            mode: 'message',
            message: {
              author: shareTargetMessage.author,
              avatar: shareTargetMessage.avatar,
              mood: shareTargetMessage.mood,
              rating: shareTargetMessage.rating,
              body: shareTargetMessage.body,
              cityTag: shareTargetMessage.cityTag,
              createdAt: shareTargetMessage.createdAt,
              imagesCount: Math.max(shareTargetMessage.images?.length ?? 0, shareTargetMessage.image ? 1 : 0),
              likesCount: shareTargetMessage.likesCount ?? 0,
              heartsCount: shareTargetMessage.heartsCount ?? 0,
            },
          }
        : mode === 'page'
          ? {
              mode: 'page',
              title,
              subtitle: wallMode === 'all'
                ? '全部城市 / 全部场次'
                : `${curStation?.venue ?? ''} / ${curStation?.date ?? ''}`,
              count: messages.length,
              stations: wallMode === 'all'
                ? stations.slice(0, 9).map((s) => ({ cityName: s.cityName, palette: s.palette }))
                : curStation
                  ? [{ cityName: curStation.cityName, palette: curStation.palette }]
                  : [],
            }
          : {
              mode: 'footprint',
              title,
              subtitle: `点亮 ${footprintStations.length} 座城市 · 发了 ${myMessagesCount} 篇日记`,
              cityCount: footprintStations.length,
              diaryCount: myMessagesCount,
              stations: footprintStations.map((s) => ({ cityName: s.cityName, palette: s.palette })),
            };

      renderShareCard(ctx, data);
      downloadCanvas(canvas, mode === 'message' ? 'chilichill-note-card.png' : mode === 'footprint' ? 'chilichill-footprint-card.png' : 'chilichill-share-card.png');
      showToast('分享卡已生成');
    } catch (error) {
      console.error('生成分享卡失败', error);
      showToast('分享卡生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={`modal ${closingRef.current ? 'closing' : 'active'}`} id="share-modal" onClick={handleClose}>
      <div className="sheet share-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <div className="sheet-avatar">📤</div>
          <h3>分享卡</h3>
          <button className="sheet-close" onClick={handleClose} aria-label="关闭">✕</button>
        </div>
        <div className="login-tabs">
          <button className={mode === 'page' ? 'on' : ''} onClick={() => setMode('page')}>当前页面</button>
          <button className={mode === 'footprint' ? 'on' : ''} onClick={() => setMode('footprint')}>我的足迹</button>
        </div>
        <div className="share-preview">
          <span>{mode === 'message' ? 'FIELD NOTE' : mode === 'page' ? 'DIARY CARD' : 'FOOTPRINT'}</span>
          <b>{title}</b>
          <p>{countText}</p>
          {mode === 'message' && shareTargetMessage && (
            <div className="share-msg-preview">
              <em>{shareTargetMessage.body.substring(0, 80)}{shareTargetMessage.body.length > 80 ? '...' : ''}</em>
              <small>👍 {shareTargetMessage.likesCount ?? 0} · ❤️ {shareTargetMessage.heartsCount ?? 0}</small>
            </div>
          )}
        </div>
        <div className="actions">
          <button className="btn cancel" onClick={handleClose} disabled={generating}>取消</button>
          <button className="btn post" onClick={generate} disabled={generating}>{generating ? '生成中...' : '生成 PNG'}</button>
        </div>
      </div>
    </div>
  );
}
