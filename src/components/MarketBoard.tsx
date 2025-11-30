"use client";

import { useState, useMemo, useEffect } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../utils/firebase";
import { Exhibitor, FilterCategory } from "../types";
import FilterBar from "./FilterBar";
import ExhibitorCard from "./ExhibitorCard";
import Modal from "./Modal";

export default function MarketBoard() {
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterCategory>("ALL");
  const [selectedExhibitor, setSelectedExhibitor] = useState<Exhibitor | null>(null);

  useEffect(() => {
    const fetchExhibitors = async () => {
      try {
        const exhibitorCollection = collection(db, "exhibitors");
        const q = query(exhibitorCollection, orderBy("name")); // Sort by name
        const snapshot = await getDocs(q);
        const exhibitorsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Exhibitor));
        setExhibitors(exhibitorsData);
      } catch (error) {
        console.error("Error fetching exhibitors:", error);
        // Here you could set an error state to show a message to the user
      } finally {
        setLoading(false);
      }
    };

    fetchExhibitors();
  }, []);

  const filteredExhibitors = useMemo(() => {
    if (filter === "ALL") {
      return exhibitors;
    }
    return exhibitors.filter((exhibitor) => exhibitor.category === filter);
  }, [exhibitors, filter]);

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
      
      {loading ? (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">出店者情報を読み込んでいます...</p>
        </div>
      ) : filteredExhibitors.length > 0 ? (
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
