"use client";

import { useState, useMemo, useEffect } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../utils/firebase";
import {
  Exhibitor,
  FilterCategory,
  Category,
  MarketEvent,
  getExhibitorCategories,
  sortEventsAscending,
  FILTER_CATEGORIES,
  CATEGORY_ICONS,
} from "../types";
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
  // 出店者名検索キーワード
  const [searchQuery, setSearchQuery] = useState<string>('');
  // 開催回フィルター (eventId または 'ALL')
  const [selectedEventId, setSelectedEventId] = useState<string>('INIT');
  const [selectedExhibitor, setSelectedExhibitor] = useState<Exhibitor | null>(null);

  // スマホ用モーダル状態
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileEventFilterOpen, setIsMobileEventFilterOpen] = useState(false);
  // スクロール状態（上部追従バーの表示用）
  const [isScrolled, setIsScrolled] = useState(false);

  // スクロール検知
  useEffect(() => {
    const handleScroll = () => {
      // 画面をスクロールしたら上部コンパクト追従バーを表示
      setIsScrolled(window.scrollY > 120);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

    // 4. 出店者名検索フィルタ
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((exhibitor) =>
        exhibitor.name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [exhibitors, selectedEventId, filter, searchQuery]);

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
      {/* 0. スクロール追従ヘッダー（スマホ・PC両対応、出店者をスクロールダウンして探しても小さく上部に表示され続ける） */}
      <div
        className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ease-in-out ${
          isScrolled
            ? 'translate-y-0 opacity-100 shadow-md pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* スマホ表示用コンパクトバー (sm:hidden) */}
        <div className="sm:hidden bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#EBE7DF]">
          {/* 次回開催のお知らせ（縦幅を狭くした極小スリム帯） */}
          {upcomingEvent && (
            <div className="bg-[#2B4C38] text-white px-3.5 py-1.5 flex items-center justify-between gap-2 text-xs border-b border-emerald-900/30">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0"></span>
                <span className="font-bold truncate text-[11px]">{upcomingEvent.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-100 shrink-0 text-[10px]">
                <span>📅 {upcomingEvent.date}</span>
              </div>
            </div>
          )}
          {/* カテゴリボタン（縦幅を狭くしたコンパクト横スクロール） */}
          <div className="py-1.5 px-3 overflow-x-auto no-scrollbar flex items-center gap-1.5">
            {FILTER_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleFilterChange(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer border ${
                  filter === cat
                    ? 'bg-[#2D5A43] text-white border-[#2D5A43] font-semibold shadow-2xs'
                    : 'bg-white text-[#5C564E] border-[#E5E0D8]'
                }`}
              >
                <span className="text-xs mr-0.5">{CATEGORY_ICONS[cat]}</span>
                <span>{cat === 'ALL' ? 'すべて' : cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* PC表示用コンパクトバー (hidden sm:block) */}
        <div className="hidden sm:block bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#EBE7DF]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-2 flex items-center justify-between gap-4">
            {/* 次回開催のお知らせ（コンパクト） */}
            {upcomingEvent && (
              <div className="flex items-center gap-2.5 bg-[#2B4C38] text-white px-3.5 py-1.5 rounded-xl text-xs shrink-0 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-300"></span>
                <span className="font-bold text-white">{upcomingEvent.name}</span>
                <span className="text-emerald-100 text-[11px] pl-2 border-l border-white/20">
                  📅 {upcomingEvent.date}
                </span>
                <span className="text-emerald-100 text-[11px] pl-2 border-l border-white/20">
                  📍 {upcomingEvent.location}
                </span>
              </div>
            )}

            {/* カテゴリボタン（コンパクト） */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {FILTER_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleFilterChange(cat)}
                  className={`px-3.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer border ${
                    filter === cat
                      ? 'bg-[#2D5A43] text-white border-[#2D5A43] font-semibold shadow-xs'
                      : 'bg-white text-[#5C564E] border-[#E5E0D8] hover:bg-[#F9F7F3] hover:text-[#2D2A26]'
                  }`}
                >
                  <span className="text-xs mr-1">{CATEGORY_ICONS[cat]}</span>
                  <span>{cat === 'ALL' ? 'すべて' : cat}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 1. ページヘッダー（シンプル＆スタイリッシュな自然派デザイン） */}
      <header className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-[#2D2A26] tracking-tight">
          ヘルシーマーケット
        </h1>
        <p className="mt-2 text-xs sm:text-sm md:text-base text-[#68635B] max-w-md sm:max-w-xl mx-auto leading-relaxed">
          自然の恵みと手仕事が息づく、こだわりの出店者さんをご紹介します。
        </p>
      </header>

      {/* 2. 次回開催日と開催場所のハイライト告知バナー */}
      {upcomingEvent && (
        <div className="relative overflow-hidden bg-[#2B4C38] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs mb-6 sm:mb-8 border border-emerald-900/40">
          <div className="relative z-10">
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
        </div>
      )}

      {/* 3. 開催回セレクター（PC・タブレット表示、スマホは右下フローティングボタンからポップアップ） */}
      <div className="hidden sm:block bg-white border border-[#EBE7DF] rounded-2xl p-3 sm:p-4 mb-6 shadow-xs">
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

      {/* 4. 出店者名 検索窓（PC・タブレット表示、スマホは右下フローティングボタンからポップアップ） */}
      <div className="hidden sm:block w-full max-w-md mx-auto mb-4 px-1">
        <div className="relative flex items-center">
          <svg
            className="w-4 h-4 text-[#8C857B] absolute left-3.5 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="出店者名で検索..."
            className="w-full pl-10 pr-9 py-2 sm:py-2.5 bg-white border border-[#E5E0D8] rounded-full text-xs sm:text-sm text-[#2D2A26] placeholder-[#9E978C] focus:outline-hidden focus:ring-2 focus:ring-[#2D5A43] focus:border-transparent transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-[#9E978C] hover:text-[#2D2A26] p-1 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="検索キーワードをクリア"
              title="クリア"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 5. カテゴリフィルターバー */}
      <FilterBar
        selectedFilter={filter}
        onFilterChange={handleFilterChange}
      />

      {/* 6. 該当件数・表示状況アナウンス */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="text-xs sm:text-sm text-[#68635B] flex flex-wrap items-center gap-1.5">
          {activeEvent ? (
            <span className="inline-flex items-center gap-1">
              <span>「<strong className="text-[#2D2A26] font-semibold">{activeEvent.name}</strong>」の出店者:</span>
              <button
                type="button"
                onClick={() => setSelectedEventId('ALL')}
                className="text-stone-400 hover:text-rose-600 font-bold ml-0.5 cursor-pointer text-xs"
                title="全店舗一覧に戻す"
              >
                ✕
              </button>
            </span>
          ) : (
            <span>登録店舗:</span>
          )}
          {searchQuery.trim() && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#2D5A43] font-medium px-2 py-0.5 rounded-md border border-emerald-200/60 text-xs">
              「{searchQuery}」で検索中
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="hover:text-rose-600 font-bold ml-0.5 cursor-pointer"
                title="検索を解除"
              >
                ✕
              </button>
            </span>
          )}
          <strong className="text-[#2D5A43] font-bold text-sm sm:text-base ml-1">{filteredExhibitors.length}</strong> 件
        </div>
      </div>

      {/* 7. 出店者カードグリッド（スマホ1カラム、タブレット2カラム、PC4カラム） */}
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
        <div className="text-center py-16 bg-white rounded-2xl border border-[#EBE7DF] p-8 shadow-xs">
          <p className="text-base text-[#2D2A26] font-medium mb-2">
            {searchQuery ? `「${searchQuery}」に一致する出店者が見つかりませんでした。` : '該当する出店者が見つかりませんでした。'}
          </p>
          <p className="text-xs text-[#8C857B] mb-4">
            出店者名のキーワードを変更するか、選択中の開催回やカテゴリ条件を変更してお試しください。
          </p>
          {(searchQuery || filter !== 'ALL' || selectedEventId !== 'ALL') && (
            <div className="flex flex-wrap justify-center gap-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-semibold text-[#2D5A43] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200/60 transition-colors cursor-pointer"
                >
                  検索キーワードをクリア
                </button>
              )}
              {filter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setFilter('ALL')}
                  className="text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  すべてのカテゴリを表示
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 出店者詳細モーダル */}
      <Modal
        exhibitor={selectedExhibitor}
        events={events}
        onClose={handleCloseModal}
        onSelectEvent={handleSelectEventFromModal}
      />

      {/* 8. スマホ用フローティングボタン群（右下固定・正円・フィルター＆検索） */}
      <aside aria-label="モバイル用絞り込み・検索" className="sm:hidden fixed bottom-6 right-4 z-40 flex flex-col gap-3 items-end">
        {/* 出店者名 検索ボタン（正円・虫眼鏡アイコン） */}
        <button
          type="button"
          onClick={() => setIsMobileSearchOpen(true)}
          aria-label="出店者名で検索"
          className="w-14 h-14 rounded-full bg-white text-[#2D5A43] border border-[#E5E0D8] shadow-lg active:scale-90 transition-all flex items-center justify-center cursor-pointer relative"
        >
          <svg className="w-6 h-6 text-[#2D5A43]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery.trim() && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-[#2D2A26] rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold">
              ✓
            </span>
          )}
        </button>

        {/* 開催回 絞り込みボタン（正円・フィルターアイコン） */}
        <button
          type="button"
          onClick={() => setIsMobileEventFilterOpen(true)}
          aria-label="開催回の絞り込み"
          className="w-14 h-14 rounded-full bg-[#2D5A43] text-white border-2 border-white/80 shadow-lg active:scale-90 transition-all flex items-center justify-center cursor-pointer relative"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {selectedEventId !== 'ALL' && selectedEventId !== 'INIT' && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-[#2D2A26] rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold">
              ✓
            </span>
          )}
        </button>
      </aside>

      {/* 9. スマホ用 出店者名検索ポップアップ */}
      {isMobileSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:hidden bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsMobileSearchOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl p-5 shadow-2xl border border-stone-200 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 text-[#2D5A43] rounded-full">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <h3 className="text-base font-bold text-[#2D2A26]">出店者名で検索</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center cursor-pointer transition-colors"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>

            {/* 検索入力欄 */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsMobileSearchOpen(false);
              }}
              className="relative mb-4"
            >
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="店名やキーワードを入力..."
                className="w-full pl-10 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-[#2D2A26] placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#2D5A43] focus:bg-white transition-all"
              />
              <svg
                className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 p-1 rounded-full cursor-pointer"
                  title="クリア"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </form>

            {/* 検索結果件数 ＆ 操作ボタン */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500 mb-4">
              <span>
                該当件数: <strong className="text-[#2D5A43] font-bold text-sm">{filteredExhibitors.length}</strong> 件
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-stone-500 hover:text-rose-600 underline cursor-pointer"
                >
                  条件をクリア
                </button>
              )}
            </div>

            {/* 完了ボタン */}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(false)}
              className="w-full py-3 bg-[#2D5A43] hover:bg-[#234735] text-white font-bold text-sm rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              結果を見る ({filteredExhibitors.length}件)
            </button>
          </div>
        </div>
      )}

      {/* 10. スマホ用 開催回の絞り込みポップアップ */}
      {isMobileEventFilterOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:hidden bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsMobileEventFilterOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl p-5 shadow-2xl border border-stone-200 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 text-[#2D5A43] rounded-full">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#2D2A26]">開催回の絞り込み</h3>
                  <p className="text-[11px] text-stone-500">表示したい開催回を選択してください</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileEventFilterOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center cursor-pointer transition-colors"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>

            {/* 開催回リスト */}
            <div className="space-y-2 overflow-y-auto max-h-[50vh] pr-1 py-1">
              {/* 次回開催ボタン */}
              {upcomingEvent && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEventId(upcomingEvent.id);
                    setIsMobileEventFilterOpen(false);
                  }}
                  className={`w-full p-3.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center justify-between cursor-pointer border ${
                    selectedEventId === upcomingEvent.id
                      ? 'bg-[#2D5A43] text-white border-[#2D5A43] shadow-xs'
                      : 'bg-emerald-50/50 text-[#2D5A43] border-emerald-200/80 hover:bg-emerald-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-base">★</span>
                    <div>
                      <div className="font-bold">次回 ({upcomingEvent.name})</div>
                      <div className={`text-xs mt-0.5 ${selectedEventId === upcomingEvent.id ? 'text-emerald-100' : 'text-stone-500'}`}>
                        {upcomingEvent.date}
                      </div>
                    </div>
                  </div>
                  {selectedEventId === upcomingEvent.id && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md font-bold">
                      選択中
                    </span>
                  )}
                </button>
              )}

              {/* 昇順ソートされた過去開催回ボタン群 */}
              {pastEvents.map((ev) => {
                const isSelected = selectedEventId === ev.id;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => {
                      setSelectedEventId(ev.id);
                      setIsMobileEventFilterOpen(false);
                    }}
                    className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-all flex items-center justify-between cursor-pointer border ${
                      isSelected
                        ? 'bg-[#2D2A26] text-white border-[#2D2A26] shadow-xs font-semibold'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span>{ev.name}</span>
                    {isSelected && (
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md font-bold">
                        選択中
                      </span>
                    )}
                  </button>
                );
              })}

              {/* 全店舗一覧 (累計) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedEventId('ALL');
                  setIsMobileEventFilterOpen(false);
                }}
                className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-all flex items-center justify-between cursor-pointer border ${
                  selectedEventId === 'ALL' || selectedEventId === 'INIT'
                    ? 'bg-[#4A453E] text-white border-[#4A453E] shadow-xs font-semibold'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span>全店舗一覧 (累計)</span>
                {(selectedEventId === 'ALL' || selectedEventId === 'INIT') && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md font-bold">
                    選択中
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
