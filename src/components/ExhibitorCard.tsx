"use client";

import Image from "next/image";
import { Exhibitor, CATEGORY_STYLES, getExhibitorCategories, getExhibitorImages } from "../types";

type Props = {
  exhibitor: Exhibitor;
  onClick: () => void;
};

const defaultStyles = {
  base: "gray",
  bg: "bg-gray-50",
  text: "text-gray-800",
  badgeBg: "bg-gray-100",
  badgeText: "text-gray-800",
  border: "border-gray-200",
};

const placeholderImage = "https://via.placeholder.com/400x300.png?text=No+Image";

export default function ExhibitorCard({ exhibitor, onClick }: Props) {
  const categories = getExhibitorCategories(exhibitor);
  const images = getExhibitorImages(exhibitor);
  const primaryCategory = categories[0];
  const primaryStyle = primaryCategory ? (CATEGORY_STYLES[primaryCategory] || defaultStyles) : defaultStyles;
  const mainImage = images[0] || exhibitor.imageUrl || placeholderImage;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col w-full rounded-2xl overflow-hidden cursor-pointer 
                 transition-all duration-300 ease-in-out bg-white border border-stone-200/80
                 shadow-sm hover:shadow-xl hover:-translate-y-1"
    >
      {/* Image Container */}
      <div className="relative w-full h-48 bg-stone-100 overflow-hidden">
        <Image
          src={mainImage}
          alt={exhibitor.name}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Image Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20"></div>

        {/* Multi-image count indicator */}
        {images.length > 1 && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-xs font-medium rounded-full flex items-center gap-1 shadow">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{images.length}枚</span>
          </div>
        )}
      </div>
      
      {/* Content Area */}
      <div className={`flex-grow flex flex-col justify-between p-4 ${primaryStyle.bg}`}>
        <div>
          <h3 className="font-bold text-xl text-stone-900 mb-1 truncate group-hover:text-emerald-700 transition-colors">
            {exhibitor.name}
          </h3>

          {/* Hashtag Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 my-2">
              {categories.map((cat) => {
                const catStyle = CATEGORY_STYLES[cat] || defaultStyles;
                return (
                  <span
                    key={cat}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${catStyle.badgeBg} ${catStyle.badgeText}`}
                  >
                    #{cat}
                  </span>
                );
              })}
            </div>
          )}

          <p className="text-sm text-stone-600 line-clamp-2 mt-1">
            {exhibitor.description || ''}
          </p>
        </div>
      </div>
    </div>
  );
}
