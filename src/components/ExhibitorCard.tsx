"use client";

import Image from "next/image";
import { Exhibitor, CATEGORY_STYLES, getExhibitorCategories, getExhibitorImages } from "../types";

type Props = {
  exhibitor: Exhibitor;
  onClick: () => void;
};

const defaultStyles = {
  base: "stone",
  bg: "bg-stone-50/60",
  text: "text-stone-800",
  badgeBg: "bg-stone-100",
  badgeText: "text-stone-800",
  border: "border-stone-200",
};

const placeholderImage = "https://via.placeholder.com/400x300.png?text=No+Image";

export default function ExhibitorCard({ exhibitor, onClick }: Props) {
  const categories = getExhibitorCategories(exhibitor);
  const images = getExhibitorImages(exhibitor);
  const mainImage = images[0] || exhibitor.imageUrl || placeholderImage;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col w-full rounded-2xl overflow-hidden cursor-pointer 
                 transition-all duration-300 ease-out bg-white border border-[#EBE7DF]
                 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]"
    >
      {/* スマホ横向き撮影比率（4:3）に合わせた画像コンテナ */}
      <div className="relative w-full aspect-[4/3] bg-[#F2EFE9] overflow-hidden">
        <Image
          src={mainImage}
          alt={exhibitor.name}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-104"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* 複数写真がある場合の枚数インジケーター */}
        {images.length > 1 && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-black/55 backdrop-blur-sm text-white text-[11px] font-medium rounded-full flex items-center gap-1 shadow-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{images.length}枚</span>
          </div>
        )}
      </div>
      
      {/* テキスト・情報エリア（シンプル＆スタイリッシュ） */}
      <div className="flex-grow flex flex-col justify-between p-3.5 sm:p-4 bg-white">
        <div>
          {/* カテゴリバッジ */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {categories.map((cat) => {
                const catStyle = CATEGORY_STYLES[cat] || defaultStyles;
                return (
                  <span
                    key={cat}
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${catStyle.badgeBg} ${catStyle.badgeText} border ${catStyle.border}`}
                  >
                    #{cat}
                  </span>
                );
              })}
            </div>
          )}

          {/* 出店者名 */}
          <h3 className="font-bold text-base sm:text-lg text-[#2D2A26] leading-snug line-clamp-1 group-hover:text-[#2D5A43] transition-colors">
            {exhibitor.name}
          </h3>

          {/* 紹介文 */}
          {exhibitor.description && (
            <p className="text-xs sm:text-sm text-[#666056] line-clamp-2 mt-1.5 leading-relaxed">
              {exhibitor.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
