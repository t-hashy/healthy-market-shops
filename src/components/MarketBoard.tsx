"use client";

import { useState, useMemo, useEffect } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../utils/firebase";
import { Exhibitor, FilterCategory, Category, MarketEvent, getExhibitorCategories, sortEventsAscending } from "../types";
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

  // 2. 開催回データの購読（名前の昇順でソート）
  useEffect(() => {
    const q = query(collection(db, "marketEvents"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as MarketEvent));
        const sorted = sortEventsAscending(list);
        setEvents(sorted);

        // 初期選択: 「次回」イベントがあればそれをデフォルト選択、なければ全店舗
        setSelectedEventId((prev) => {
          if (prev !== 'INIT') return prev;
          const upcoming = sorted.find((e) => e.isUpcoming);
          if (upcoming) return upcoming.id;
          return sorted[0]?.id || 'ALL';
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-7xl">
      {/* 1. ページヘッダー（シンプル＆スタイリッシュな自然派デザイン） */}
      <header className="text-center mb-6 sm:mb-8">
        <div className="inline-block mb-1.5">
          <span className="text-[10px] sm:text-xs tracking-[0.25em] text-[#2D5A43] font-semibold uppercase bg-emerald-50/80 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
            Organic &amp; Natural Marche
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-[#2D2A26] tracking-tight">
          ヘルシーマーケット
        </h1>
        <p className="mt-2 text-xs sm:text-sm md:text-base text-[#68635B] max-w-md sm:max-w-xl mx-auto leading-relaxed">
          自然の恵みと手仕事が息づく、こだわりの出店者さんをご紹介します。
        </p>
      </header>

      {/* 2. 次回開催日と開催場所のハイライト告知バナー（スマホ見やすいオーガニックグリーン） */}
      {upcomingEvent && (
        <div className="relative overflow-hidden bg-[#2B4C38] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs mb-6 sm:mb-8 border border-emerald-900/40">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/15 text-emerald-100 text-[11px] font-medium px-2.5 py-0.5 rounded-full mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>
                次回開催のお知らせ
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
                {upcomingEvent.name}
              </h2>
              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 sm:gap-x-6 text-emerald-100/90 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="opacity-80">📅</span>
                  <span className="font-medium text-white">{upcomingEvent.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="opacity-80">📍</span>
                  <span className="font-medium text-white">{upcomingEvent.location}</span>
                </div>
              </div>
            </div>

            {/* 次回出店者表示ボタン */}
            <div className="flex-shrink-0 pt-1 md:pt-0">
              <button
                type="button"
                onClick={() => setSelectedEventId(upcomingEvent.id)}
                className={`w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedEventId === upcomingEvent.id
                    ? 'bg-white text-[#2B4C38] shadow-sm font-bold'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
              >
                <span>{selectedEventId === upcomingEvent.id ? '✓ 次回の出店者を表示中' : '次回の出店者を見る'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. 開催回セレクター（スマホで親指スクロールしやすい横スクロールピルバー） */}
      <div className="bg-white border border-[#EBE7DF] rounded-2xl p-3 sm:p-4 mb-6 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#2D2A26]">開催回</span>
            {activeEvent && (
              <span className="text-[11px] bg-emerald-50 text-[#2D5A43] font-semibold px-2 py-0.5 rounded-md border border-emerald-200/60">
                {activeEvent.name}
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#8C857B]">
            名前順（昇順）
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {/* 次回開催ボタン */}
          {upcomingEvent && (
            <button
              type="button"
              onClick={() => setSelectedEventId(upcomingEvent.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                selectedEventId === upcomingEvent.id
                  ? 'bg-[#2D5A43] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-[#5C564E] border border-[#E5E0D8] hover:bg-[#F2EEE6]'
              }`}
            >
              <span>★</span>
              <span>次回 ({upcomingEvent.name})</span>
            </button>
          )}

          {/* 昇順ソートされた過去回ボタン群 */}
          {pastEvents.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => setSelectedEventId(ev.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedEventId === ev.id
                  ? 'bg-[#2D2A26] text-white shadow-xs font-semibold'
                  : 'bg-[#FAF8F5] text-[#5C564E] border border-[#E5E0D8] hover:bg-[#F2EEE6]'
              }`}
            >
              <span>{ev.name}</span>
            </button>
          ))}

          {/* 全出店者ボタン */}
          <button
            type="button"
            onClick={() => setSelectedEventId('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              selectedEventId === 'ALL' || selectedEventId === 'INIT'
                ? 'bg-[#4A453E] text-white shadow-xs font-semibold'
                : 'bg-[#FAF8F5] text-[#7C756B] border border-[#E5E0D8] hover:bg-[#F2EEE6]'
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
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="text-xs sm:text-sm text-[#68635B]">
          {activeEvent ? (
            <span>
              「<strong className="text-[#2D2A26] font-semibold">{activeEvent.name}</strong>」の出店者:
            </span>
          ) : (
            <span>登録店舗:</span>
          )}{' '}
          <strong className="text-[#2D5A43] font-bold text-sm sm:text-base">{filteredExhibitors.length}</strong> 件
        </div>
      </div>

      {/* 6. 出店者カードグリッド（スマホ1カラム、タブレット2カラム、PC4カラム） */}
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
