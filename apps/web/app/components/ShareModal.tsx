'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { renderShareCard, type ShareCardData } from '@/lib/shareCard';

type ShareMode = 'page' | 'footprint' | 'message';

const SHARE_BASE_URL = 'https://www.707o.cc';
const PREVIEW_W = 270;
const PREVIEW_H = 360;

/* ===== 下载 ===== */
function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function ShareModal() {
  const {
    shareOpen, setShareOpen, shareMode, shareTargetMessage, stations, messages, wallMode, curStation,
    footprintStationIds, myStationIds, myDiaryCount, user, showToast,
  } = useApp();
  const [mode, setMode] = useState<ShareMode>(shareMode);
  const [generating, setGenerating] = useState(false);
  const closingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);

  const footprintIds = [...new Set([...footprintStationIds, ...myStationIds])];
  const footprintStations = stations.filter((s) => footprintIds.includes(s.id));
  const myMessagesCount = user ? myDiaryCount : 0;

  useEffect(() => { setMode(shareMode); }, [shareMode]);

  const handleClose = useCallback(() => {
    closingRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { closingRef.current = false; setShareOpen(false); }, 250);
  }, [setShareOpen]);

  const title = mode === 'message' && shareTargetMessage
    ? `${shareTargetMessage.author}的现场日记`
    : mode === 'page'
      ? (wallMode === 'all' ? '全站巡演日记' : `${curStation?.cityName ?? '巡演'}站日记`)
      : `${user?.username ?? '我'}的巡演足迹`;

  /* ===== 构造分享卡数据（生成与实时预览共用） ===== */
  const buildShareData = useCallback((): ShareCardData => {
    if (mode === 'message' && shareTargetMessage) {
      const msg = shareTargetMessage;
      return {
        mode: 'message',
        qrUrl: `${SHARE_BASE_URL}/?m=${encodeURIComponent(msg.id)}`,
        message: {
          author: msg.author,
          avatar: msg.avatar,
          mood: msg.mood,
          rating: msg.rating,
          body: msg.body,
          cityTag: msg.cityTag,
          createdAt: msg.createdAt,
          imagesCount: Math.max(msg.images?.length ?? 0, msg.image ? 1 : 0),
          likesCount: msg.likesCount ?? 0,
          heartsCount: msg.heartsCount ?? 0,
        },
      };
    }
    if (mode === 'page') {
      return {
        mode: 'page',
        qrUrl: wallMode === 'all'
          ? `${SHARE_BASE_URL}/?all=1`
          : `${SHARE_BASE_URL}/?station=${encodeURIComponent(curStation?.id ?? '')}`,
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
      };
    }
    return {
      mode: 'footprint',
      qrUrl: `${SHARE_BASE_URL}/?u=${encodeURIComponent(user?.username ?? '')}`,
      title,
      subtitle: `点亮 ${footprintStations.length} 座城市 · 发了 ${myMessagesCount} 篇日记`,
      cityCount: footprintStations.length,
      diaryCount: myMessagesCount,
      stations: footprintStations.map((s) => ({ cityName: s.cityName, palette: s.palette })),
    };
  }, [mode, shareTargetMessage, wallMode, curStation, stations, messages, user, footprintStations, myMessagesCount, title]);

  /* ===== 实时预览 ===== */
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !shareOpen) return;
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = PREVIEW_W;
      canvas.height = PREVIEW_H;
      ctx.save();
      ctx.scale(PREVIEW_W / 1080, PREVIEW_H / 1440);
      renderShareCard(ctx, buildShareData());
      ctx.restore();
    };
    document.fonts.ready.then(draw).catch(draw);
    return () => { cancelled = true; };
  }, [buildShareData, shareOpen]);

  /* ===== 复制深链 ===== */
  const copyLink = useCallback(async () => {
    const url = buildShareData().qrUrl ?? SHARE_BASE_URL;
    try {
      await navigator.clipboard.writeText(url);
      showToast('链接已复制');
    } catch {
      showToast('复制失败，请手动复制');
    }
  }, [buildShareData, showToast]);

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

      renderShareCard(ctx, buildShareData());
      downloadCanvas(canvas, mode === 'message' ? 'chilichill-note-card.png' : mode === 'footprint' ? 'chilichill-footprint-card.png' : 'chilichill-share-card.png');
      showToast('分享卡已生成');
    } catch (error) {
      console.error('生成分享卡失败', error);
      showToast('分享卡生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  if (!shareOpen && !closingRef.current) return null;

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
          <canvas ref={previewRef} width={PREVIEW_W} height={PREVIEW_H} className="share-preview-canvas" aria-label="分享卡预览" />
        </div>
        <div className="share-row">
          <button className="link" onClick={copyLink} disabled={generating}>复制链接</button>
          <button className="pic" onClick={generate} disabled={generating}>保存图片</button>
        </div>
        <div className="actions">
          <button className="btn cancel" onClick={handleClose} disabled={generating}>取消</button>
          <button className="btn post" onClick={generate} disabled={generating}>{generating ? '生成中...' : '生成 PNG'}</button>
        </div>
      </div>
    </div>
  );
}
