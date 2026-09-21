"use client";

import { FILTER_CATEGORIES, FilterCategory } from "../types";

type Props = {
  selectedFilter: FilterCategory;
  onFilterChange: (category: FilterCategory) => void;
};

// 各カテゴリ固有のマステカラー & 手ちぎり風の傾きスタイル
const TAPE_CONFIGS: Record<
  FilterCategory,
  {
    bgActive: string;
    bgInactive: string;
    borderActive: string;
    borderInactive: string;
    textColorActive: string;
    textColorInactive: string;
    rotation: string;
    label: string;
  }
> = {
  ALL: {
    bgActive: "bg-[#F0C987]",
    bgInactive: "bg-[#F7E1B5] hover:bg-[#F2D69E]",
    borderActive: "border-[#8C5E24]",
    borderInactive: "border-[#A07844]",
    textColorActive: "text-[#3D250A]",
    textColorInactive: "text-[#543818]",
    rotation: "-rotate-2",
    label: "すべて",
  },
  農家: {
    bgActive: "bg-[#A7D49B]",
    bgInactive: "bg-[#C4E6BB] hover:bg-[#B3DCAB]",
    borderActive: "border-[#3A6B2F]",
    borderInactive: "border-[#508044]",
    textColorActive: "text-[#1C3E14]",
    textColorInactive: "text-[#2A5220]",
    rotation: "rotate-1.5",
    label: "農家",
  },
  飲食: {
    bgActive: "bg-[#F5A987]",
    bgInactive: "bg-[#F9C7B2] hover:bg-[#F6B69B]",
    borderActive: "border-[#8E3B1C]",
    borderInactive: "border-[#AB512F]",
    textColorActive: "text-[#4A1705]",
    textColorInactive: "text-[#6B2A10]",
    rotation: "-rotate-1",
    label: "飲食",
  },
  カフェ: {
    bgActive: "bg-[#D8BA9B]",
    bgInactive: "bg-[#E6D2BD] hover:bg-[#DFC4A9]",
    borderActive: "border-[#6E4E2E]",
    borderInactive: "border-[#8C6946]",
    textColorActive: "text-[#33200F]",
    textColorInactive: "text-[#4E341E]",
    rotation: "rotate-2",
    label: "カフェ",
  },
  クラフト: {
    bgActive: "bg-[#B4CCE4]",
    bgInactive: "bg-[#CFDFF0] hover:bg-[#BCD2E8]",
    borderActive: "border-[#335680]",
    borderInactive: "border-[#4A6E99]",
    textColorActive: "text-[#142942]",
    textColorInactive: "text-[#234164]",
    rotation: "-rotate-1.5",
    label: "クラフト",
  },
};

export default function FilterBar({ selectedFilter, onFilterChange }: Props) {
  return (
    <div className="w-full my-3 px-1 sm:px-3 select-none">
      {/* スマホ画面でも文字を小さくして横一列に全て表示 */}
      <div className="flex flex-row items-center justify-between gap-1 sm:gap-2.5 w-full">
        {FILTER_CATEGORIES.map((category) => {
          const isSelected = selectedFilter === category;
          const conf = TAPE_CONFIGS[category];

          return (
            <button
              key={category}
              type="button"
              onClick={() => onFilterChange(category)}
              aria-pressed={isSelected}
              className={`flex-1 min-w-0 py-1.5 sm:py-2 px-1 sm:px-2.5 
                         tape-torn transition-all duration-200 cursor-pointer 
                         flex items-center justify-center gap-0.5 sm:gap-1.5
                         ${conf.rotation}
                         ${
                           isSelected
                             ? `${conf.bgActive} ${conf.textColorActive} shadow-[0_3px_6px_rgba(30,15,5,0.45)] ring-2 ring-[#2D2622]/40 scale-102 -translate-y-0.5`
                             : `${conf.bgInactive} ${conf.textColorInactive} shadow-[0_2px_4px_rgba(30,15,5,0.25)] hover:-translate-y-1 hover:scale-105 hover:rotate-0`
                         }`}
            >
              {/* ラベル（カテゴリ名のみ） */}
              <span className="text-[11px] sm:text-xs md:text-sm font-black truncate tracking-wide">
                {conf.label}
              </span>

              {/* 選択中の小さな押しピンまたはマーク */}
              {isSelected && (
                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-[#2D2622] flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

