"use client";

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
  const mainImage = images[0] || exhibitor.imageUrl || placeholderImage;

  // あえてランダム風に傾き（-1.5deg 〜 1.5deg）をつけて温かみのあるポラロイド感を追加
  const rotations = [
    "rotate-[1.2deg]",
    "-rotate-[1deg]",
    "rotate-[0.8deg]",
    "-rotate-[1.5deg]",
    "rotate-[1.5deg]",
    "-rotate-[0.8deg]",
  ];
  const tiltClass = rotations[index % rotations.length];

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col w-full bg-[#FDFBF7] rounded-lg cursor-pointer 
                 transition-all duration-300 ease-out border-2 border-[#3A3530]
                 shadow-[3px_3px_0px_0px_rgba(58,53,48,0.85)] hover:shadow-[5px_5px_0px_0px_rgba(58,53,48,1)]
                 hover:-translate-y-1 ${tiltClass} hover:rotate-0 hover:scale-[1.02] p-1.5 sm:p-2.5`}
    >
      {/* マスキングテープ風の装飾ワンポイント */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 sm:w-16 h-3.5 sm:h-5 masking-tape-amber z-10 -rotate-2 pointer-events-none opacity-80 rounded-xs border-dashed border-amber-300/40"></div>

      {/* 写真エリア（ポラロイド風） */}
      <div className="relative w-full aspect-[4/3] bg-[#FAF6F0] rounded-sm overflow-hidden border border-stone-200">
        <Image
          src={mainImage}
          alt={exhibitor.name}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-108"
          fill
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
        />

        {/* 写真枚数表示 */}
        {images.length > 1 && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-[#3A3530]/80 text-white text-[9px] sm:text-[11px] font-bold rounded-full flex items-center gap-0.5 shadow-2xs">
            <span>📷</span>
            <span>{images.length}</span>
          </div>
        )}
      </div>
      
      {/* 情報エリア */}
      <div className="flex-grow flex flex-col justify-between pt-1.5 sm:pt-2.5 px-0.5">
        <div>
          {/* スタンプ風カテゴリバッジ */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {categories.map((cat) => {
                const catStyle = CATEGORY_STYLES[cat] || defaultStyles;
                return (
                  <span
                    key={cat}
                    className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] sm:text-xs font-bold ${catStyle.badgeBg} ${catStyle.badgeText} border ${catStyle.border} shadow-2xs`}
                  >
                    {cat}
                  </span>
                );
              })}
            </div>
          )}

          {/* 出店者名 */}
          <h3 className="font-extrabold text-xs sm:text-base text-[#2D2622] leading-tight line-clamp-1 group-hover:text-[#C86D51] transition-colors">
            {exhibitor.name}
          </h3>

          {/* 紹介文（PC・タブレットで短く表示、スマホは簡潔に） */}
          {exhibitor.description && (
            <p className="text-[10px] sm:text-xs text-[#59483E] line-clamp-2 mt-1 leading-relaxed hidden sm:block">
              {exhibitor.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
