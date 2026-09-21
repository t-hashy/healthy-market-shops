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

export default function Modal({ exhibitor, events = [], onClose, onSelectEvent }: Props) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [prevExhibitorId, setPrevExhibitorId] = useState(exhibitor?.id);
  const [isEditRequestOpen, setIsEditRequestOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  if (exhibitor?.id !== prevExhibitorId) {
    setPrevExhibitorId(exhibitor?.id);
    setActiveImageIndex(0);
    setIsHistoryExpanded(false);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!exhibitor) {
    return null;
  }

  const categories = getExhibitorCategories(exhibitor);
  const images = getExhibitorImages(exhibitor);
  const links = getExhibitorLinks(exhibitor);
  const participatingEvents = getExhibitorEvents(exhibitor, events);
  const currentImage = images[activeImageIndex] || exhibitor.imageUrl || placeholderImage;

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      id="modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-2xl max-h-[90vh] bg-[#FDFBF7] border-2 border-[#3A3530] rounded-2xl shadow-[6px_6px_0px_0px_rgba(58,53,48,1)] overflow-hidden animate-slide-up-fade"
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-3 right-3 z-30 w-9 h-9 text-[#2D2622] bg-[#FAF6F0] border-2 border-[#3A3530] rounded-full hover:bg-rose-100 shadow-md transition-all font-black text-sm flex items-center justify-center cursor-pointer"
        >
          ✕
        </button>

        {/* 写真ギャラリー */}
        <div className="relative w-full bg-[#FAF6F0] flex-shrink-0 border-b-2 border-[#3A3530]">
          <div className="relative w-full aspect-[4/3] max-h-[42vh] sm:max-h-[52vh]">
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#3A3530]/80 text-white font-bold flex items-center justify-center shadow hover:bg-[#3A3530]"
                >
                  ‹
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#3A3530]/80 text-white font-bold flex items-center justify-center shadow hover:bg-[#3A3530]"
                >
                  ›
                </button>
                <div className="absolute bottom-2 right-2 px-2.5 py-0.5 text-xs font-bold text-white bg-[#3A3530]/80 rounded-full">
                  {activeImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 詳細コンテンツ */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {categories.map((cat) => {
                const catStyle = CATEGORY_STYLES[cat] || defaultStyles;
                return (
                  <span
                    key={cat}
                    className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full ${catStyle.badgeBg} ${catStyle.badgeText} border ${catStyle.border}`}
                  >
                    #{cat}
                  </span>
                );
              })}
            </div>
          )}

          <h2 className="text-xl sm:text-3xl font-black text-[#2D2622] mb-3 tracking-tight">
            {exhibitor.name}
          </h2>

          {exhibitor.description && (
            <p className="text-xs sm:text-sm text-[#59483E] leading-relaxed whitespace-pre-wrap mb-4 bg-white/60 p-3 rounded-xl border border-stone-200">
              {exhibitor.description}
            </p>
          )}

          {exhibitor.marketDays && (
            <div className="mb-3 flex items-center gap-2 text-xs sm:text-sm text-[#4A3E38]">
              <span className="font-extrabold text-[#C86D51]">📅 出店日:</span>
              <span>{exhibitor.marketDays}</span>
            </div>
          )}

          {exhibitor.address && (
            <div className="mb-4 flex items-start gap-2 text-xs sm:text-sm text-[#4A3E38]">
              <span className="font-extrabold text-[#4A6B5D]">📍 エリア:</span>
              <span>{exhibitor.address}</span>
            </div>
          )}

          {/* Web・SNSリンク */}
          {links.length > 0 && (
            <div className="mb-5 pt-3 border-t-2 border-dashed border-stone-300">
              <h3 className="text-xs sm:text-sm font-extrabold text-[#2D2622] mb-2">
                🌐 ウェブサイト & SNS
              </h3>
              <div className="flex flex-wrap gap-2">
                {links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-[#2D2622] border-2 border-[#3A3530] shadow-[2px_2px_0px_0px_rgba(58,53,48,1)] hover:bg-[#FAF6F0]"
                  >
                    <span>{link.title}</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 出店履歴 */}
          {participatingEvents.length > 0 && (
            <div className="mb-4 p-3 bg-[#FAF6F0] rounded-xl border-2 border-stone-300">
              <div className="text-xs font-extrabold text-[#2D2622] mb-2">
                🎪 出店履歴 (累計 {participatingEvents.length} 回)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {participatingEvents.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent && onSelectEvent(ev.id)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white text-[#4A3E38] border border-stone-400 hover:border-[#4A6B5D] cursor-pointer"
                  >
                    {ev.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 掲載内容の変更・お問い合わせ */}
          <div className="mt-6 pt-3 border-t border-stone-300 flex justify-start">
            <button
              type="button"
              onClick={() => setIsEditRequestOpen(true)}
              className="text-xs font-bold text-[#C86D51] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>✎</span>
              <span>掲載内容の変更・お問い合わせ</span>
            </button>
          </div>
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
