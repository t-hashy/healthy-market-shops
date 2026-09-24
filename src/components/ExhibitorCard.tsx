"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Exhibitor, CATEGORY_STYLES, getExhibitorCategories, getExhibitorImages } from "../types";

type Props = {
  exhibitor: Exhibitor;
  onClick: () => void;
  index?: number;
};

const defaultStyles = {
  base: "stone",
  bg: "bg-stone-50",
  text: "text-stone-800",
  badgeBg: "bg-[#EFE8E1]",
  badgeText: "text-[#59483E]",
  border: "border-[#7C6A5D]",
};

const placeholderImage = "https://via.placeholder.com/400x300.png?text=No+Image";

export default function ExhibitorCard({ exhibitor, onClick, index = 0 }: Props) {
  const categories = getExhibitorCategories(exhibitor);
  const images = getExhibitorImages(exhibitor);
  // 一覧カード専用サムネイル（横長 2:1）を最優先で使用
  const mainImage = exhibitor.thumbnailUrl || images[0] || exhibitor.imageUrl || placeholderImage;

  // 出店者紹介文の整形（PC表示用：100文字で切って以降は「...」とする）
  const truncatedDescription = useMemo(() => {
    if (!exhibitor.description) return null;
    const text = exhibitor.description.trim();
    return text.length > 100 ? `${text.slice(0, 100)}...` : text;
  }, [exhibitor.description]);

  // ポラロイド・クラフト感のあるランダムな傾き（rotate-1 や -rotate-1）
  const rotations = [
    "rotate-1",
    "-rotate-1",
    "rotate-[0.8deg]",
    "-rotate-[0.6deg]",
    "rotate-[1.2deg]",
    "-rotate-[1.2deg]",
  ];
  const tiltClass = rotations[index % rotations.length];

  // マスキングテープ風の装飾カラーバリエーション（透過なし・100%不透明のソリッドカラー）
  const tapeStyles = [
    "bg-[#F6DE95] border-[#D9BD6E] -rotate-2",
    "bg-[#C5E8BD] border-[#91C784] rotate-2",
    "bg-[#F9C3B0] border-[#E09078] -rotate-1",
    "bg-[#CFE2F4] border-[#96BEE3] rotate-1",
    "bg-[#EAD6C0] border-[#C4A685] -rotate-1.5",
  ];
  const tapeClass = tapeStyles[index % tapeStyles.length];

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col w-full aspect-square memo-paper-card rounded-md sm:rounded-lg cursor-pointer 
                 transition-all duration-300 ease-out
                 hover:-translate-y-1.5 ${tiltClass} hover:rotate-0 hover:scale-[1.03] 
                 p-2 sm:p-2.5 overflow-visible select-none`}
    >
      {/* メモ用紙をコルクボードに貼るマスキングテープ（ピンなし・マステで貼るだけのデザイン） */}
      <div
        className={`absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 w-12 sm:w-16 h-3.5 sm:h-4.5 
                   border border-dashed rounded-xs z-20 pointer-events-none 
                   shadow-[1px_1.5px_0px_rgba(40,20,5,0.2)] opacity-100 ${tapeClass}`}
      />

      {/* メモ用紙のミシン目（上部のちぎり跡風ドット線） */}
      <div className="absolute top-0 left-0 right-0 border-t border-dashed border-[#8C7A6B]/30 pointer-events-none" />

      {/* 写真エリア（メモ用紙に貼られたスナップ写真風：横長2:1比率 & ホバーで拡大・微回転） */}
      <div className="relative w-full h-[52%] bg-[#FAF6F0] rounded-xs overflow-hidden border border-[#5C4D42]/30 flex-shrink-0 shadow-xs">
        <div className="relative w-full h-full transition-transform duration-300 ease-out group-hover:scale-108 group-hover:rotate-1">
          <Image
            src={mainImage}
            alt={exhibitor.name}
            className="object-cover"
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          />
        </div>

        {/* 写真枚数表示 */}
        {images.length > 1 && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-[#2D2622]/85 text-white text-[8px] sm:text-[10px] font-bold rounded-full flex items-center gap-0.5 shadow-2xs z-10">
            <span>📷</span>
            <span>{images.length}</span>
          </div>
        )}
      </div>

      {/* 情報エリア（メモ用紙に手書きされたような風合い） */}
      <div className="flex-1 flex flex-col justify-between pt-1.5 sm:pt-1.5 overflow-hidden">
        <div>
          {/* 丸型・スタンプ風カテゴリバッジ */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1 max-h-5 overflow-hidden">
              {categories.slice(0, 2).map((cat) => {
                const catStyle = CATEGORY_STYLES[cat] || defaultStyles;
                return (
                  <span
                    key={cat}
                    className={`inline-flex items-center px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border border-[#2D2622]/30 shadow-2xs whitespace-nowrap ${catStyle.badgeBg} ${catStyle.badgeText}`}
                  >
                    {cat}
                  </span>
                );
              })}
            </div>
          )}

          {/* 出店者名（手書きメモ風の文字） */}
          <h3 className="font-title font-black text-xs sm:text-xs md:text-sm text-[#2D2622] leading-tight truncate group-hover:text-[#C86D51] transition-colors">
            {exhibitor.name}
          </h3>

          {/* 出店者紹介文（PC表示のみ表示、100文字で切って「...」とする） */}
          {truncatedDescription && (
            <p className="hidden sm:block text-[10px] sm:text-xs text-[#59483E] line-clamp-2 mt-0.5 leading-snug">
              {truncatedDescription}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
