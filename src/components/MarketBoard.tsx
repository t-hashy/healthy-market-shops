"use client";

import { useState, useMemo } from "react";
import { Exhibitor, FilterCategory } from "../types";
import FilterBar from "./FilterBar";
import ExhibitorCard from "./ExhibitorCard";
import Modal from "./Modal";

type Props = {
  exhibitors: Exhibitor[];
};

export default function MarketBoard({ exhibitors }: Props) {
  // State for the currently selected category filter. Default is 'ALL'.
  const [filter, setFilter] = useState<FilterCategory>("ALL");
  
  // State for the exhibitor currently shown in the modal. Null if no modal is open.
  const [selectedExhibitor, setSelectedExhibitor] = useState<Exhibitor | null>(null);

  // Memoize the filtered list of exhibitors.
  // This ensures the filter logic only reruns when the filter or the exhibitors list changes.
  const filteredExhibitors = useMemo(() => {
    if (filter === "ALL") {
      return exhibitors;
    }
    return exhibitors.filter((exhibitor) => exhibitor.category === filter);
  }, [exhibitors, filter]);

  // Handlers are passed down to child components to update the state.
  const handleFilterChange = (category: FilterCategory) => setFilter(category);
  const handleCardClick = (exhibitor: Exhibitor) => setSelectedExhibitor(exhibitor);
  const handleCloseModal = () => setSelectedExhibitor(null);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          ヘルシーマーケット出店者
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-600">
          こだわりの逸品を持った素敵な出店者さんをご紹介します。
        </p>
      </header>

      <FilterBar
        selectedFilter={filter}
        onFilterChange={handleFilterChange}
      />
      
      {filteredExhibitors.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredExhibitors.map((exhibitor) => (
            <ExhibitorCard
              key={exhibitor.id}
              exhibitor={exhibitor}
              onClick={() => handleCardClick(exhibitor)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">該当する出店者が見つかりませんでした。</p>
        </div>
      )}

      <Modal exhibitor={selectedExhibitor} onClose={handleCloseModal} />
    </div>
  );
}
