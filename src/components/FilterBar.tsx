"use client";

import { FILTER_CATEGORIES, FilterCategory } from "../types";

type Props = {
  selectedFilter: FilterCategory;
  onFilterChange: (category: FilterCategory) => void;
};

const CATEGORY_ICONS: Record<FilterCategory, string> = {
  ALL: "🌱",
  農家: "🥬",
  飲食: "🍲",
  カフェ: "☕",
  クラフト: "🧵",
};

export default function FilterBar({ selectedFilter, onFilterChange }: Props) {
  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 px-1">
        {FILTER_CATEGORIES.map((category) => {
          const isSelected = selectedFilter === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onFilterChange(category)}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ease-out whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                isSelected
                  ? "bg-[#2D5A43] text-white border-[#2D5A43] shadow-xs scale-102 font-semibold"
                  : "bg-white text-[#5C564E] border-[#E5E0D8] hover:bg-[#F9F7F3] hover:text-[#2D2A26] hover:border-[#D0C9BD]"
              }`}
            >
              <span className="text-xs">{CATEGORY_ICONS[category]}</span>
              <span>{category === "ALL" ? "すべて" : category}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
