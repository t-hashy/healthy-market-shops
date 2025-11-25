"use client";

import { FILTER_CATEGORIES, FilterCategory, CATEGORY_STYLES, Category } from "../types";

type Props = {
  selectedFilter: FilterCategory;
  onFilterChange: (category: FilterCategory) => void;
};

// Define a default style for the "ALL" category.
const ALL_CATEGORY_STYLE = {
  base: "gray",
  bg: "bg-gray-200",
  text: "text-gray-800", // Ensure dark text for readability
};

// A simple, reusable button component for filtering.
const FilterButton = ({ category, selected, onClick }: { category: FilterCategory, selected: boolean, onClick: () => void }) => {
  const baseStyle = "px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 ease-in-out shadow-sm whitespace-nowrap";
  
  // Determine the category style. Use ALL_CATEGORY_STYLE if the category is "ALL".
  const categorySpecificStyle = category === "ALL" ? ALL_CATEGORY_STYLE : CATEGORY_STYLES[category as Category];
  
  const selectedStyle = `bg-${categorySpecificStyle.base}-600 ${categorySpecificStyle.text} scale-105 shadow-lg`;
  const unselectedStyle = "bg-white text-gray-700 hover:bg-gray-100 hover:shadow-md";

  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${selected ? selectedStyle : unselectedStyle}`}
    >
      {category}
    </button>
  );
};


export default function FilterBar({ selectedFilter, onFilterChange }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-4 mb-8 bg-gray-50 rounded-xl shadow-inner">
      {FILTER_CATEGORIES.map((category) => (
        <FilterButton
          key={category}
          category={category}
          selected={selectedFilter === category}
          onClick={() => onFilterChange(category)}
        />
      ))}
    </div>
  );
}
