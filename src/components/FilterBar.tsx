"use client";

import { FILTER_CATEGORIES, FilterCategory, CATEGORY_ICONS } from "../types";

type Props = {
  selectedFilter: FilterCategory;
  onFilterChange: (category: FilterCategory) => void;
};

export default function FilterBar({ selectedFilter, onFilterChange }: Props) {
  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar py-2 px-1">
        {FILTER_CATEGORIES.map((category) => {
          const isSelected = selectedFilter === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onFilterChange(category)}
              className={`px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-1.5 border-2 border-[#3A3530] ${
                isSelected
                  ? "bg-[#C86D51] text-white shadow-[2px_2px_0px_0px_rgba(58,53,48,1)] -translate-y-0.5"
                  : "bg-[#FDFBF7] text-[#4A3E38] shadow-[2px_2px_0px_0px_rgba(58,53,48,0.6)] hover:bg-[#F7EFE5] hover:-translate-y-0.5"
              }`}
            >
              <span className="text-sm">{CATEGORY_ICONS[category]}</span>
              <span>{category === "ALL" ? "みんな見る" : category}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
