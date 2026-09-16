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
  base: "gray",
  bg: "bg-gray-100",
  text: "text-gray-800",
  badgeBg: "bg-gray-100",
  badgeText: "text-gray-800",
  border: "border-gray-200",
};

const placeholderImage = "https://via.placeholder.com/600x400.png?text=No+Image";

function getLinkIcon(title: string, url: string) {
  const t = `${title} ${url}`.toLowerCase();
  if (t.includes("insta") || t.includes("インスタ")) {
    return (
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    );
  }
  if (t.includes("face") || t.includes("fb") || t.includes("フェイスブック")) {
    return (
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.776-3.89 1.094 0 2.24.195 2.24.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h3.046l-.497 2.987h-2.549V22C18.343 21.128 22 16.991 22 12z" />
      </svg>
    );
  }
  if (t.includes("twitter") || t.includes("ツイッター") || t.includes(" x") || title === "X") {
    return (
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.814L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  if (t.includes("line") || t.includes("ライン")) {
    return (
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>
    );
  }
  if (t.includes("youtube") || t.includes("ユーチューブ")) {
    return (
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }
  if (t.includes("shop") || t.includes("ショップ") || t.includes("ec") || t.includes("store") || t.includes("販売")) {
    return (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function getLinkBtnStyle(title: string, url: string): string {
  const t = `${title} ${url}`.toLowerCase();
  if (t.includes("insta") || t.includes("インスタ")) {
    return "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white hover:opacity-90";
  }
  if (t.includes("face") || t.includes("fb") || t.includes("フェイスブック")) {
    return "bg-blue-600 text-white hover:bg-blue-700";
  }
  if (t.includes("twitter") || t.includes("ツイッター") || t.includes(" x") || title === "X") {
    return "bg-stone-900 text-white hover:bg-stone-800";
  }
  if (t.includes("line") || t.includes("ライン")) {
    return "bg-emerald-500 text-white hover:bg-emerald-600";
  }
  if (t.includes("youtube") || t.includes("ユーチューブ")) {
    return "bg-red-600 text-white hover:bg-red-700";
  }
  if (t.includes("shop") || t.includes("ショップ") || t.includes("ec")) {
    return "bg-amber-600 text-white hover:bg-amber-700";
  }
  return "bg-stone-100 text-stone-800 border border-stone-300 hover:bg-stone-200";
}

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

  // Effect to handle 'Escape' key press for closing the modal
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl 
                   overflow-hidden animate-slide-up-fade"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-3 right-3 z-30 p-2 text-stone-600 bg-white/80 backdrop-blur-md rounded-full
                     hover:bg-white hover:text-stone-900 shadow-md transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Image Gallery Area */}
        <div className="relative w-full bg-stone-900 flex-shrink-0">
          <div className="relative w-full h-64 md:h-80">
            <Image
              src={currentImage}
              alt={`${exhibitor.name} 画像 ${activeImageIndex + 1}`}
              className="object-cover"
              fill
              priority
            />

            {/* Prev / Next controls if multiple images */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/75 transition-all shadow"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleNextImage}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/75 transition-all shadow"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="absolute bottom-3 right-3 px-2.5 py-1 text-xs font-semibold text-white bg-black/60 backdrop-blur-md rounded-full shadow">
                  {activeImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail row if multiple images */}
          {images.length > 1 && (
            <div className="flex gap-2 p-2 bg-stone-950 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                    idx === activeImageIndex
                      ? "ring-2 ring-emerald-500 scale-105 opacity-100"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-8 overflow-y-auto">
          {/* Categories as Hashtags */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.map((cat) => {
                const catStyle = CATEGORY_STYLES[cat] || defaultStyles;
                return (
                  <span
                    key={cat}
                    className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${catStyle.badgeBg} ${catStyle.badgeText} border ${catStyle.border}`}
                  >
                    #{cat}
                  </span>
                );
              })}
            </div>
          )}

          <h2 className="text-3xl md:text-4xl font-extrabold text-stone-900 mb-4">{exhibitor.name}</h2>

          {/* Description */}
          {exhibitor.description && (
            <div className="mb-6">
              <p className="text-base md:text-lg text-stone-700 leading-relaxed whitespace-pre-wrap">
                {exhibitor.description}
              </p>
            </div>
          )}

          {/* Market Days */}
          {exhibitor.marketDays && (
            <div className="mb-4 flex items-center gap-2 text-stone-700">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold text-stone-900">出店日:</span>
              <span>{exhibitor.marketDays}</span>
            </div>
          )}

          {/* Address */}
          {exhibitor.address && (
            <div className="mb-6 flex items-start gap-2 text-stone-700">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <span className="font-semibold text-stone-900">所在地 / エリア:</span>
                <p className="text-stone-700 mt-0.5">{exhibitor.address}</p>
              </div>
            </div>
          )}

          {/* 出店履歴（出店回一覧） */}
          {participatingEvents.length > 0 && (
            <div className="mb-6 p-4 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-stone-900">過去の出店回</span>
                  <span className="text-xs text-stone-500 font-medium">
                    (累計 {participatingEvents.length} 回)
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 font-medium">
                  クリックで該当回の出店者一覧へ
                </span>
              </div>

              {/* 出店回タグリスト（上限を超えたら折りたたみ・スクロール領域） */}
              <div
                className={`flex flex-wrap gap-2 transition-all ${
                  isHistoryExpanded
                    ? 'max-h-36 overflow-y-auto pr-1'
                    : participatingEvents.length > 4
                    ? 'max-h-20 overflow-hidden'
                    : ''
                }`}
              >
                {(isHistoryExpanded ? participatingEvents : participatingEvents.slice(0, 4)).map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => {
                      if (onSelectEvent) {
                        onSelectEvent(ev.id);
                      }
                    }}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-stone-800 border border-stone-300 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 transition-all cursor-pointer shadow-2xs"
                    title={`「${ev.name}」の出店者一覧を表示`}
                  >
                    <span>📅 {ev.name}</span>
                    {ev.isUpcoming && (
                      <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                        次回
                      </span>
                    )}
                    <svg
                      className="w-3 h-3 text-stone-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>

              {/* 4件以上ある場合の畳み込み・展開トグルボタン */}
              {participatingEvents.length > 4 && (
                <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    {isHistoryExpanded ? (
                      <>
                        <span>折りたたむ</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>他 {participatingEvents.length - 4} 件の出店回を表示</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Links (Website & SNS) */}
          {links.length > 0 && (
            <div className="mt-6 pt-6 border-t border-stone-200">
              <h3 className="text-lg font-bold text-stone-900 mb-3">ウェブサイト・SNS</h3>
              <div className="flex flex-wrap gap-2.5">
                {links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 ${getLinkBtnStyle(
                      link.title,
                      link.url
                    )}`}
                  >
                    {getLinkIcon(link.title, link.url)}
                    <span>{link.title}</span>
                    <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0l-7 7" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 出店者向け修正依頼リンク（左下に小さく配置） */}
          <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-start">
            <button
              type="button"
              onClick={() => setIsEditRequestOpen(true)}
              className="text-xs text-stone-400 hover:text-emerald-700 underline decoration-stone-300 hover:decoration-emerald-500 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>情報の修正・更新を依頼する</span>
            </button>
          </div>
        </div>
      </div>

      {/* 修正依頼入力モーダル */}
      <EditRequestModal
        isOpen={isEditRequestOpen}
        onClose={() => setIsEditRequestOpen(false)}
        exhibitor={exhibitor}
      />
    </div>
  );
}