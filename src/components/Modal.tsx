"use client";

import Image from "next/image";
import {
  Exhibitor,
  MarketEvent,
  CATEGORY_STYLES,
  getExhibitorCategories,
  getExhibitorImages,
  getExhibitorLinks,
  getExhibitorEvents,
} from "../types";
import { useEffect, useState } from "react";
import EditRequestModal from "./EditRequestModal";

type Props = {
  exhibitor: Exhibitor | null;
  events?: MarketEvent[];
  onClose: () => void;
  onSelectEvent?: (eventId: string) => void;
  onPrevExhibitor?: () => void;
  onNextExhibitor?: () => void;
  currentIndex?: number;
  totalCount?: number;
};

const defaultStyles = {
  base: "stone",
  bg: "bg-stone-50",
  text: "text-stone-800",
  badgeBg: "bg-[#EFE8E1]",
  badgeText: "text-[#59483E]",
  border: "border-[#7C6A5D]",
};

const placeholderImage = "https://via.placeholder.com/600x400.png?text=No+Image";

export default function Modal({
  exhibitor,
  events = [],
  onClose,
  onSelectEvent,
  onPrevExhibitor,
  onNextExhibitor,
  currentIndex,
  totalCount,
}: Props) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [prevExhibitorId, setPrevExhibitorId] = useState(exhibitor?.id);
  const [isEditRequestOpen, setIsEditRequestOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // スワイプ検知用の座標状態
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  if (exhibitor?.id !== prevExhibitorId) {
    setPrevExhibitorId(exhibitor?.id);
    setActiveImageIndex(0);
    setIsHistoryExpanded(false);
  }

  // キーボード操作（Escape: 閉じる, ArrowLeft: 前の出店者, ArrowRight: 次の出店者）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        if (onPrevExhibitor) onPrevExhibitor();
      } else if (event.key === "ArrowRight") {
        if (onNextExhibitor) onNextExhibitor();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onPrevExhibitor, onNextExhibitor]);

  if (!exhibitor) {
    return null;
  }

  const categories = getExhibitorCategories(exhibitor);
  const images = getExhibitorImages(exhibitor);
  const links = getExhibitorLinks(exhibitor);
  const participatingEvents = getExhibitorEvents(exhibitor, events);
  const currentImage = images[activeImageIndex] || exhibitor.imageUrl || placeholderImage;

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // タッチ操作（スワイプ）による出店者切り替え
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // 水平方向への移動が45px以上、かつ縦移動より顕著な場合にスワイプと判定
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX > 0) {
        // 右スワイプ: 前の出店者
        if (onPrevExhibitor) onPrevExhibitor();
      } else {
        // 左スワイプ: 次の出店者
        if (onNextExhibitor) onNextExhibitor();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  return (
    <div
      id="modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
    >
      {/* PC用: モーダル左外側のフローティング「前の出店者」ボタン */}
      {onPrevExhibitor && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrevExhibitor();
          }}
          aria-label="前の出店者"
          className="hidden md:flex fixed left-4 lg:left-8 top-1/2 -translate-y-1/2 w-13 h-13 rounded-full bg-[#FAF6F0] text-[#2D2622] border-2 border-[#2D2622] shadow-signboard-lg hover:scale-110 active:scale-95 transition-all items-center justify-center font-black text-2xl cursor-pointer z-50 group"
          title="前の出店者 (←キー)"
        >
          <span>‹</span>
          <span className="sr-only">前の出店者</span>
        </button>
      )}

      {/* PC用: モーダル右外側のフローティング「次の出店者」ボタン */}
      {onNextExhibitor && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNextExhibitor();
          }}
          aria-label="次の出店者"
          className="hidden md:flex fixed right-4 lg:right-8 top-1/2 -translate-y-1/2 w-13 h-13 rounded-full bg-[#FAF6F0] text-[#2D2622] border-2 border-[#2D2622] shadow-signboard-lg hover:scale-110 active:scale-95 transition-all items-center justify-center font-black text-2xl cursor-pointer z-50 group"
          title="次の出店者 (→キー)"
        >
          <span>›</span>
          <span className="sr-only">次の出店者</span>
        </button>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative flex flex-col w-full max-w-2xl max-h-[92vh] memo-paper-modal rounded-2xl sm:rounded-3xl overflow-hidden animate-slide-up-fade"
      >
        {/* メモ用紙をボードに留める大きなマスキングテープ（上部中央） */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-28 sm:w-36 h-6 bg-amber-200/90 border border-dashed border-amber-400/70 shadow-[0_2px_6px_rgba(40,20,5,0.35)] z-30 pointer-events-none -rotate-1 rounded-xs backdrop-blur-[0.5px]" />

        {/* メモ用紙のちぎり取りミシン目（上部ドット線） */}
        <div className="absolute top-0 left-0 right-0 border-t-2 border-dashed border-[#8C7A6B]/40 pointer-events-none z-20" />

        {/* モーダル上部ヘッダー（ナビゲーション ＆ 閉じるボタン） */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-[#FAF6F0]/80 border-b border-[#3D322B]/20 select-none z-10">
          {/* 前後ナビゲーション (スマホ・PC共通) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onPrevExhibitor && (
              <button
                type="button"
                onClick={onPrevExhibitor}
                className="px-2.5 py-1 rounded-full bg-white text-[#2D2622] border-2 border-[#2D2622] shadow-2xs hover:bg-[#FAF6F0] active:scale-95 font-bold text-xs flex items-center gap-1 cursor-pointer transition-transform"
                aria-label="前の出店者"
              >
                <span>‹</span>
                <span className="hidden sm:inline text-[11px]">前へ</span>
              </button>
            )}

            {currentIndex !== undefined && totalCount !== undefined && (
              <span className="text-[11px] sm:text-xs font-black text-[#59483E] px-1 font-handwriting">
                {currentIndex + 1} / {totalCount}
              </span>
            )}

            {onNextExhibitor && (
              <button
                type="button"
                onClick={onNextExhibitor}
                className="px-2.5 py-1 rounded-full bg-white text-[#2D2622] border-2 border-[#2D2622] shadow-2xs hover:bg-[#FAF6F0] active:scale-95 font-bold text-xs flex items-center gap-1 cursor-pointer transition-transform"
                aria-label="次の出店者"
              >
                <span className="hidden sm:inline text-[11px]">次へ</span>
                <span>›</span>
              </button>
            )}

            <span className="text-[10px] text-stone-400 hidden sm:inline ml-1 font-handwriting">
              (横スワイプ・左右矢印キー切替可)
            </span>
          </div>

          {/* 閉じるボタン（木製風丸ボタン） */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 text-[#2D2622] bg-white border-2 border-[#2D2622] rounded-full hover:bg-rose-100 shadow-2xs transition-all font-black text-xs flex items-center justify-center cursor-pointer hover:rotate-90"
          >
            ✕
          </button>
        </div>

        {/* 写真ギャラリー（メモ用紙に貼り付けられたポラロイドスナップ写真風） */}
        <div className="relative w-full bg-[#FAF6F0]/40 p-3 sm:p-5 flex-shrink-0 flex items-center justify-center border-b border-[#3D322B]/15">
          <div className="relative w-full max-w-lg bg-white p-2 sm:p-3 pb-4 sm:pb-6 rounded-md shadow-md border border-stone-300 -rotate-0.5">
            {/* ポラロイド写真の角に貼られたミニマスキングテープ */}
            <div className="absolute -top-2 right-4 w-12 h-4 bg-emerald-200/80 border border-dashed border-emerald-400/60 shadow-xs rotate-3 z-10 pointer-events-none" />

            <div className="relative w-full aspect-[4/3] max-h-[38vh] sm:max-h-[46vh] bg-[#FAF6F0] rounded-xs overflow-hidden border border-stone-200">
              <Image
                src={currentImage}
                alt={`${exhibitor.name} 画像 ${activeImageIndex + 1}`}
                className="object-contain"
                fill
                priority
              />

              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#2D2622]/80 text-white font-bold flex items-center justify-center shadow hover:bg-[#2D2622] active:scale-95 transition-all cursor-pointer"
                  >
                    ‹
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#2D2622]/80 text-white font-bold flex items-center justify-center shadow hover:bg-[#2D2622] active:scale-95 transition-all cursor-pointer"
                  >
                    ›
                  </button>
                  <div className="absolute bottom-2 right-2 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-white bg-[#2D2622]/85 rounded-full shadow-xs">
                    📷 {activeImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {/* ポラロイド下の余白（手書きキャプション風） */}
            <div className="mt-2 text-center">
              <span className="font-handwriting text-xs text-[#5C4D42] tracking-wider">
                〜 {exhibitor.name} 〜
              </span>
            </div>
          </div>
        </div>

        {/* 手書きメモ用紙の詳細コンテンツ */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {/* カテゴリ（手押しスタンプ風バッジ） */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {categories.map((cat) => {
                const catStyle = CATEGORY_STYLES[cat] || defaultStyles;
                return (
                  <span
                    key={cat}
                    className={`inline-flex items-center px-3 py-0.5 text-xs font-black rounded-full border-2 border-[#2D2622]/40 shadow-2xs ${catStyle.badgeBg} ${catStyle.badgeText}`}
                  >
                    ★ {cat}
                  </span>
                );
              })}
            </div>
          )}

          {/* 出店者名（手書き風タイトル ＆ マーカー下線） */}
          <div className="relative inline-block mb-4">
            <h2 className="font-title text-2xl sm:text-4xl font-black text-[#2D2622] tracking-tight relative z-10">
              {exhibitor.name}
            </h2>
            {/* マーカーハイライト下線 */}
            <div className="absolute bottom-1 left-0 right-0 h-3 bg-[#E0A96D]/35 -rotate-0.5 -z-0 rounded-xs" />
          </div>

          {/* 出店者紹介文（メモ用紙に手書きで書かれたようなメッセージ欄） */}
          {exhibitor.description && (
            <div className="relative mb-5 bg-[#FAF6F0]/70 p-4 sm:p-5 rounded-xl border-2 border-dashed border-[#8C7A6B]/50 shadow-2xs">
              <div className="text-xs sm:text-sm font-black text-[#8C5D3A] mb-1.5 flex items-center gap-1 font-handwriting">
                <span>わたしたち</span>
              </div>
              <p className="text-base sm:text-base text-[#2D2622] leading-relaxed whitespace-pre-wrap font-sans">
                {exhibitor.description}
              </p>
            </div>
          )}

          {/* 出店日 ＆ エリア（付箋メモ風） */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
            {exhibitor.marketDays && (
              <div className="flex items-center gap-2.5 text-sm sm:text-base text-[#2D2622] bg-[#FAF6F0] p-3 rounded-lg border border-[#3D322B]/20 shadow-2xs">
                <span className="font-black text-[#C86D51] text-lg">📅</span>
                <div>
                  <div className="text-xs text-stone-500 font-bold">出店日</div>
                  <div className="font-bold text-sm sm:text-base">{exhibitor.marketDays}</div>
                </div>
              </div>
            )}

            {exhibitor.address && (
              <div className="flex items-start gap-2.5 text-sm sm:text-base text-[#2D2622] bg-[#FAF6F0] p-3 rounded-lg border border-[#3D322B]/20 shadow-2xs">
                <span className="font-black text-[#4A6B5D] text-lg">📍</span>
                <div>
                  <div className="text-xs text-stone-500 font-bold">エリア・ブース</div>
                  <div className="font-bold text-sm sm:text-base">{exhibitor.address}</div>
                </div>
              </div>
            )}
          </div>

          {/* Web・SNSリンク（カラフルなマスキングテープ風ボタン） */}
          {links.length > 0 && (
            <div className="mb-5 pt-3 border-t-2 border-dashed border-[#8C7A6B]/30">
             
              <div className="flex flex-wrap gap-2">
                {links.map((link, idx) => {
                  const tapeColors = [
                    'bg-emerald-100/90 text-emerald-900 border-emerald-300 hover:bg-emerald-200',
                    'bg-amber-100/90 text-amber-900 border-amber-300 hover:bg-amber-200',
                    'bg-rose-100/90 text-rose-900 border-rose-300 hover:bg-rose-200',
                    'bg-sky-100/90 text-sky-900 border-sky-300 hover:bg-sky-200',
                  ];
                  const tapeClass = tapeColors[idx % tapeColors.length];
                  return (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-black border border-dashed shadow-2xs hover:-translate-y-0.5 transition-all ${tapeClass}`}
                    >
                      <span>{link.title}</span>
                      <span className="text-[10px]">↗</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* 出店履歴（スタンプカード風） */}
          {participatingEvents.length > 0 && (
            <div className="mb-4 p-3 bg-[#FAF6F0]/90 rounded-xl border-2 border-dashed border-[#8C7A6B]/40">
              <div className="text-xs sm:text-sm font-black text-[#2D2622] mb-2 flex items-center gap-1 font-handwriting">
                
                <span>出店履歴</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {participatingEvents.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent && onSelectEvent(ev.id)}
                    className="text-xs sm:text-sm font-bold px-2.5 py-1 rounded-full bg-white text-[#4A3E38] border border-stone-400 hover:border-[#4A6B5D] hover:bg-emerald-50 cursor-pointer shadow-2xs transition-colors"
                  >
                    💮 {ev.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 掲載内容の変更・お問い合わせ */}
          <div className="mt-5 pt-3 border-t border-stone-300/60 flex justify-start">
            <button
              type="button"
              onClick={() => setIsEditRequestOpen(true)}
              className="text-xs sm:text-sm font-bold text-[#C86D51] hover:underline flex items-center gap-1 cursor-pointer font-handwriting"
            >
              <span>✎</span>
              <span>掲載内容の変更・お問い合わせはこちら</span>
            </button>
          </div>
        </div>

        {/* モーダル下部ナビゲーションバー（クラフト調） */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAF6F0]/90 border-t border-[#3D322B]/20 select-none">
          {onPrevExhibitor ? (
            <button
              type="button"
              onClick={onPrevExhibitor}
              className="px-3 py-1.5 rounded-full bg-white text-[#2D2622] border-2 border-[#2D2622] shadow-2xs hover:bg-[#FAF6F0] active:scale-95 font-bold text-xs flex items-center gap-1 cursor-pointer transition-transform"
            >
              <span>‹</span>
              <span>前の出店者</span>
            </button>
          ) : <div />}

          {currentIndex !== undefined && totalCount !== undefined && (
            <span className="text-xs font-black text-[#59483E] font-handwriting">
              {currentIndex + 1} / {totalCount}
            </span>
          )}

          {onNextExhibitor ? (
            <button
              type="button"
              onClick={onNextExhibitor}
              className="px-3 py-1.5 rounded-full bg-white text-[#2D2622] border-2 border-[#2D2622] shadow-2xs hover:bg-[#FAF6F0] active:scale-95 font-bold text-xs flex items-center gap-1 cursor-pointer transition-transform"
            >
              <span>次の出店者</span>
              <span>›</span>
            </button>
          ) : <div />}
        </div>
      </div>

      <EditRequestModal
        isOpen={isEditRequestOpen}
        onClose={() => setIsEditRequestOpen(false)}
        exhibitor={exhibitor}
      />
    </div>
  );
}
