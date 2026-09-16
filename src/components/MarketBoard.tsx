"use client";

import { useState, useMemo, useEffect } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../utils/firebase";
import { Exhibitor, FilterCategory, Category, MarketEvent, getExhibitorCategories } from "../types";
import FilterBar from "./FilterBar";
import ExhibitorCard from "./ExhibitorCard";
import Modal from "./Modal";

export default function MarketBoard() {
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // カテゴリフィルター
  const [filter, setFilter] = useState<FilterCategory>("ALL");
  // 開催回フィルター (eventId または 'ALL')
  const [selectedEventId, setSelectedEventId] = useState<string>('INIT');
  const [selectedExhibitor, setSelectedExhibitor] = useState<Exhibitor | null>(null);

  // 1. 出店者データの購読
  useEffect(() => {
    const q = query(collection(db, "exhibitors"), orderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Exhibitor));
        setExhibitors(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching exhibitors:", err);
        setError("出店者データの取得に失敗しました。Firebase Firestoreの権限設定を確認してください。");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. 開催回データの購読
  useEffect(() => {
    const q = query(collection(db, "marketEvents"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as MarketEvent));
        setEvents(list);

        // 初期選択: 「次回」イベントがあればそれをデフォルト選択、なければ全店舗
        setSelectedEventId((prev) => {
          if (prev !== 'INIT') return prev;
          const upcoming = list.find((e) => e.isUpcoming);
          if (upcoming) return upcoming.id;
          return list[0]?.id || 'ALL';
        });
      },
      (err) => {
        console.warn("Error fetching marketEvents:", err);
      }
    );
    return () => unsubscribe();
  }, []);

  // 次回開催回（最新またはisUpcoming）
  const upcomingEvent = useMemo(() => {
    return events.find((e) => e.isUpcoming) || events[0] || null;
  }, [events]);

  // 現在選択中のイベント
  const activeEvent = useMemo(() => {
    if (selectedEventId === 'ALL' || selectedEventId === 'INIT') return null;
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  // 過去の開催回（次回イベント以外の回）
  const pastEvents = useMemo(() => {
    if (!upcomingEvent) return events;
    return events.filter((e) => e.id !== upcomingEvent.id);
  }, [events, upcomingEvent]);

  // 出店者の絞り込み（非表示除外、開催回フィルタ、カテゴリフィルタ）
  const filteredExhibitors = useMemo(() => {
    // 1. 非表示フラグ除外
    let list = exhibitors.filter((e) => !e.isHidden);

    // 2. 開催回フィルタ
    if (selectedEventId !== 'ALL' && selectedEventId !== 'INIT') {
      list = list.filter(
        (e) => Array.isArray(e.eventIds) && e.eventIds.includes(selectedEventId)
      );
    }

    // 3. カテゴリフィルタ
    if (filter !== "ALL") {
      list = list.filter((exhibitor) => {
        const categories = getExhibitorCategories(exhibitor);
        return categories.includes(filter as Category);
      });
    }

    return list;
  }, [exhibitors, selectedEventId, filter]);

  const handleFilterChange = (category: FilterCategory) => setFilter(category);
  const handleCardClick = (exhibitor: Exhibitor) => setSelectedExhibitor(exhibitor);
  const handleCloseModal = () => setSelectedExhibitor(null);

  // ポップアップ内の出店回クリック時にフィルターを切り替える
  const handleSelectEventFromModal = (eventId: string) => {
    setSelectedEventId(eventId);
    setSelectedExhibitor(null);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
      {/* 1. ページヘッダー */}
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-stone-900 tracking-tight">
          ヘルシーマーケット
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-base sm:text-lg text-stone-600">
          こだわりの農産物や食、クラフトの素敵な出店者さんをご紹介します。
        </p>
      </header>

      {/* 2. 次回開催日と開催場所のハイライト告知バナー */}
      {upcomingEvent && (
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-10 border border-emerald-500/30">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/50 backdrop-blur-md text-emerald-100 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping"></span>
                次回開催のご案内
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
                {upcomingEvent.name}
              </h2>
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-emerald-50 text-sm sm:text-base">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  <span className="font-bold">{upcomingEvent.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📍</span>
                  <span className="font-semibold">{upcomingEvent.location}</span>
                </div>
              </div>
            </div>

            {/* 次回出店者表示ボタン */}
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedEventId(upcomingEvent.id)}
                className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                  selectedEventId === upcomingEvent.id
                    ? 'bg-white text-emerald-800 ring-4 ring-emerald-300/40 shadow-lg scale-102'
                    : 'bg-emerald-500/40 hover:bg-white hover:text-emerald-800 text-white border border-white/30'
                }`}
              >
                <span>{selectedEventId === upcomingEvent.id ? '✓ 次回出店者を閲覧中' : '次回出店者を表示'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. 開催回フィルターセレクター */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 sm:p-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-stone-900">開催回で絞り込む</span>
            {activeEvent && (
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                {activeEvent.name}
              </span>
            )}
          </div>
          <span className="text-xs text-stone-500">
            ボタンをクリックすると、その回の出店者に切り替わります
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 次回開催ボタン */}
          {upcomingEvent && (
            <button
              type="button"
              onClick={() => setSelectedEventId(upcomingEvent.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                selectedEventId === upcomingEvent.id
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 scale-102'
                  : 'bg-white text-stone-700 border border-stone-300 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50'
              }`}
            >
              <span>★</span>
              <span>次回 ({upcomingEvent.name})</span>
            </button>
          )}

          {/* 過去回ボタン群 */}
          {pastEvents.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => setSelectedEventId(ev.id)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                selectedEventId === ev.id
                  ? 'bg-stone-800 text-white shadow-md ring-2 ring-stone-500 scale-102'
                  : 'bg-white text-stone-700 border border-stone-300 hover:border-stone-400 hover:bg-stone-100'
              }`}
            >
              <span>{ev.name}</span>
            </button>
          ))}

          {/* 全出店者ボタン */}
          <button
            type="button"
            onClick={() => setSelectedEventId('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-2xs ${
              selectedEventId === 'ALL' || selectedEventId === 'INIT'
                ? 'bg-stone-700 text-white shadow-md ring-2 ring-stone-400 scale-102'
                : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-100'
            }`}
          >
            全店舗一覧 (累計)
          </button>
        </div>
      </div>

      {/* 4. カテゴリフィルターバー */}
      <FilterBar
        selectedFilter={filter}
        onFilterChange={handleFilterChange}
      />

      {/* 5. 該当件数・表示状況アナウンス */}
      <div className="flex items-center justify-between mt-6 mb-4 px-1">
        <div className="text-sm text-stone-600">
          {activeEvent ? (
            <span>
              「<strong className="text-stone-900">{activeEvent.name}</strong>」の出店者:
            </span>
          ) : (
            <span>全登録出店者:</span>
          )}{' '}
          <strong className="text-emerald-700 font-bold text-base">{filteredExhibitors.length}</strong> 件
        </div>
      </div>
      
      {/* 6. 出店者カードグリッド */}
      {loading ? (
        <div className="text-center py-16">
          <p className="text-lg text-stone-500">出店者情報を読み込んでいます...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 max-w-xl mx-auto p-6 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-lg font-semibold text-amber-800">{error}</p>
          <p className="mt-2 text-sm text-amber-700">
            Firebase Consoleの「Cloud Firestore」&gt;「ルール」の設定を確認してください。
          </p>
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
        <div className="text-center py-16 bg-stone-50 rounded-2xl border border-stone-200 p-8">
          <p className="text-base text-stone-600 font-medium mb-2">
            該当する出店者が見つかりませんでした。
          </p>
          <p className="text-xs text-stone-400">
            選択中の開催回やカテゴリ条件を変更してお試しください。
          </p>
        </div>
      )}

      {/* 出店者詳細モーダル */}
      <Modal
        exhibitor={selectedExhibitor}
        events={events}
        onClose={handleCloseModal}
        onSelectEvent={handleSelectEventFromModal}
      />
    </div>
  );
}
