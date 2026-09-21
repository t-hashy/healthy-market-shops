"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
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

  // チラシ（JPG画像）拡大表示モーダル用状態
  const [activeFlyerUrl, setActiveFlyerUrl] = useState<string | null>(null);

  // スマホ用モーダル状態
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileEventFilterOpen, setIsMobileEventFilterOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // スクロール検知
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 150);
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

  // 2. 開催回データの購読
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

  // 次回開催回
  const upcomingEvent = useMemo(() => {
    return events.find((e) => e.isUpcoming) || events[0] || null;
  }, [events]);

  // 現在選択中のイベント
  const activeEvent = useMemo(() => {
    if (selectedEventId === 'ALL' || selectedEventId === 'INIT') return null;
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  // 過去の開催回
  const pastEvents = useMemo(() => {
    if (!upcomingEvent) return events;
    return events.filter((e) => e.id !== upcomingEvent.id);
  }, [events, upcomingEvent]);

  // 出店者の絞り込み
  const filteredExhibitors = useMemo(() => {
    let list = exhibitors.filter((e) => !e.isHidden);

    if (selectedEventId !== 'ALL' && selectedEventId !== 'INIT') {
      list = list.filter(
        (e) => Array.isArray(e.eventIds) && e.eventIds.includes(selectedEventId)
      );
    }

    if (filter !== "ALL") {
      list = list.filter((exhibitor) => {
        const categories = getExhibitorCategories(exhibitor);
        return categories.includes(filter as Category);
      });
    }

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

  const handleSelectEventFromModal = (eventId: string) => {
    setSelectedEventId(eventId);
    setSelectedExhibitor(null);
  };

  // チラシ画像URLの動的判定（選択中イベント -> 次回イベント -> チラシを持つイベント）
  const activeEventFlyer = useMemo(() => {
    if (activeEvent?.flyerUrl) return activeEvent.flyerUrl;
    if (activeEvent?.flyerImageUrl) return activeEvent.flyerImageUrl;
    if (upcomingEvent?.flyerUrl) return upcomingEvent.flyerUrl;
    if (upcomingEvent?.flyerImageUrl) return upcomingEvent.flyerImageUrl;
    const eventWithFlyer = events.find((e) => e.flyerUrl || e.flyerImageUrl);
    return eventWithFlyer?.flyerUrl || eventWithFlyer?.flyerImageUrl || null;
  }, [activeEvent, upcomingEvent, events]);

  // チラシモーダル用のEscapeキー監視
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveFlyerUrl(null);
      }
    };
    if (activeFlyerUrl) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [activeFlyerUrl]);

  return (
    <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-7xl">
      {/* スクロール追従スリムバー */}
      <div
        className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ease-in-out ${
          isScrolled
            ? 'translate-y-0 opacity-100 shadow-md pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-[#FAF6F0]/95 backdrop-blur-md border-b-2 border-[#2D2622]">
          <div className="container mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-xl">🎪</span>
              <span className="font-black text-xs sm:text-base text-[#2D2622] truncate">
                Healthy Market
              </span>
            </div>
            {/* カテゴリボタン（スリム） */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {FILTER_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleFilterChange(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap border-2 border-[#2D2622] ${
                    filter === cat
                      ? 'bg-[#C86D51] text-white shadow-signboard'
                      : 'bg-white text-[#4A3E38]'
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span className="hidden sm:inline ml-1">{cat === 'ALL' ? 'すべて' : cat}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 1. ヘッダー (ロゴ・見出し: Healthy Market) */}
      <header className="text-center mb-6 sm:mb-8 relative">
        <div className="inline-block bg-[#E0A96D]/30 px-4 py-1 rounded-full text-xs sm:text-sm font-bold text-[#8C4A28] mb-2 border border-[#E0A96D]/60 -rotate-1 shadow-2xs">
          🌱 おいしい・たのしい・手作りマルシェ
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#2D2622] tracking-tight drop-shadow-xs">
          Healthy Market
        </h1>
        <p className="text-xs sm:text-sm font-bold text-[#8C4A28] mt-1.5 tracking-wider">
          ヘルシーマーケット
        </p>

        {/* トップページ上部の「イベントチラシを見る」ボタン */}
        {activeEventFlyer && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setActiveFlyerUrl(activeEventFlyer)}
              className="btn-signboard-terracotta text-xs sm:text-sm font-black px-5 py-2.5 rounded-full flex items-center gap-2 cursor-pointer shadow-signboard hover:scale-105 active:scale-95 transition-all"
            >
              <span className="text-base sm:text-lg">🖼️</span>
              <span>イベントチラシを見る (JPG)</span>
              <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-bold">拡大表示</span>
            </button>
          </div>
        )}
      </header>

      {/* 2. イベントチラシ（JPG）閲覧セクション & 次回案内 */}
      <div className="mb-8">
        <div className="bg-[#FDFBF7] border-2 border-[#2D2622] rounded-2xl p-4 sm:p-5 shadow-signboard-lg">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* 開催情報 */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">📅</span>
                <span className="text-xs font-black text-[#8C4A28] uppercase tracking-wider">
                  Event Information
                </span>
                {upcomingEvent && (
                  <span className="text-[11px] font-extrabold bg-[#E2EFE0] text-[#2D532B] px-2.5 py-0.5 rounded-full border border-[#4A6B5D]">
                    次回開催決定
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-xl font-black text-[#2D2622]">
                {activeEvent ? activeEvent.name : upcomingEvent ? upcomingEvent.name : "次回ヘルシーマーケット"}
              </h2>
              <div className="mt-2 space-y-1 text-xs sm:text-sm text-[#59483E] font-medium">
                {(activeEvent?.date || upcomingEvent?.date) && (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#C86D51]">日時:</span>
                    <span>{activeEvent?.date || upcomingEvent?.date}</span>
                  </div>
                )}
                {(activeEvent?.location || upcomingEvent?.location) && (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#4A6B5D]">場所:</span>
                    <span>{activeEvent?.location || upcomingEvent?.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* チラシサムネイル & 拡大ボタン */}
            <div className="flex sm:flex-col items-center justify-center gap-2 sm:w-56 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l-2 border-dashed border-stone-200 sm:pl-5">
              {activeEventFlyer ? (
                <div
                  onClick={() => setActiveFlyerUrl(activeEventFlyer)}
                  className="group relative w-full h-28 sm:h-32 bg-stone-100 rounded-xl overflow-hidden border-2 border-[#2D2622] cursor-pointer shadow-signboard hover:scale-[1.02] transition-transform"
                >
                  <Image
                    src={activeEventFlyer}
                    alt="イベントチラシ (JPG)"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="bg-[#FAF6F0] text-[#2D2622] font-black text-xs px-3 py-1.5 rounded-full border-2 border-[#2D2622] shadow-xs flex items-center gap-1">
                      <span>🔍</span>
                      <span>チラシを拡大</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-28 sm:h-32 bg-[#FAF6F0] rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-center p-2 text-stone-500">
                  <span className="text-2xl mb-1">📜</span>
                  <span className="text-xs font-bold text-[#4A3E38]">次回チラシ準備中</span>
                  <span className="text-[10px] text-stone-400 mt-0.5">開催日が近づくと掲載されます</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. 開催日を選ぶ (いつ行く？ 開催日を選ぶ) */}
      <div className="bg-[#FDFBF7] border-2 border-[#2D2622] rounded-2xl p-3.5 sm:p-5 mb-8 shadow-signboard">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗓️</span>
            <h2 className="text-sm sm:text-base font-black text-[#2D2622]">
              いつ行く？ 開催日を選ぶ
            </h2>
            {activeEvent && (
              <span className="text-xs bg-[#E2EFE0] text-[#2D532B] font-extrabold px-2.5 py-0.5 rounded-full border border-[#4A6B5D]">
                {activeEvent.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {upcomingEvent && (
            <button
              type="button"
              onClick={() => setSelectedEventId(upcomingEvent.id)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap border-2 border-[#2D2622] flex items-center gap-1 ${
                selectedEventId === upcomingEvent.id
                  ? 'bg-[#4A6B5D] text-white shadow-signboard'
                  : 'bg-white text-[#4A3E38] hover:bg-[#FAF6F0]'
              }`}
            >
              <span>★</span>
              <span>次回 ({upcomingEvent.name})</span>
            </button>
          )}

          {pastEvents.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => setSelectedEventId(ev.id)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap border-2 border-[#2D2622] ${
                selectedEventId === ev.id
                  ? 'bg-[#3A3530] text-white shadow-signboard'
                  : 'bg-white text-[#4A3E38] hover:bg-[#FAF6F0]'
              }`}
            >
              <span>{ev.name}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setSelectedEventId('ALL')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap border-2 border-[#2D2622] ${
              selectedEventId === 'ALL' || selectedEventId === 'INIT'
                ? 'bg-[#7C6A5D] text-white shadow-signboard'
                : 'bg-white text-[#59483E] hover:bg-[#FAF6F0]'
            }`}
          >
            全店舗一覧 (累計)
          </button>
        </div>
      </div>

      {/* 4. 紙のフライヤー風メッセージ枠 (検索バーの直上に配置) */}
      <div className="relative max-w-2xl mx-auto mb-6 bg-[#FDFBF7] border-2 border-[#2D2622] rounded-2xl p-5 sm:p-6 shadow-signboard-lg -rotate-[0.6deg] transition-transform hover:rotate-0">
        <div className="absolute -top-3 left-8 w-20 sm:w-28 h-5 masking-tape-amber -rotate-2 border-dashed border-amber-300/40"></div>
        <div className="absolute -top-3 right-8 w-16 sm:w-24 h-5 masking-tape-green rotate-3 border-dashed border-emerald-300/40"></div>
        <div className="flex items-start gap-3 pt-1">
          <span className="text-3xl sm:text-4xl flex-shrink-0">🌾</span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#2D2622] leading-snug">
              からだに優しい食べものと、手作りのぬくもりが集まる小さなマーケットです
            </h2>
            <p className="text-xs sm:text-sm text-[#59483E] mt-2 leading-relaxed">
              地域の農家さんが育てた新鮮な野菜、ていねいに焼き上げたパンや焼き菓子、心を込めたハンドメイド作品。出店者さんとの会話を楽しみながら、とっておきのお気に入りを見つけに来てくださいね。
            </p>
          </div>
        </div>
      </div>


      {/* 5. 検索窓 (何をお探しですか？) */}
      <div className="w-full max-w-md mx-auto mb-6 px-1">
        <div className="relative flex items-center">
          <span className="absolute left-4 text-base pointer-events-none">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="何をお探しですか？ (店名や商品)"
            className="w-full pl-11 pr-10 py-2.5 sm:py-3 bg-[#FDFBF7] border-2 border-[#2D2622] rounded-full text-xs sm:text-sm text-[#2D2622] placeholder-[#8C7B70] focus:outline-hidden focus:ring-2 focus:ring-[#C86D51] transition-all shadow-signboard font-bold"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-stone-500 hover:text-rose-600 p-1 rounded-full cursor-pointer font-bold"
              aria-label="検索キーワードをクリア"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 6. カテゴリフィルターバー */}
      <FilterBar
        selectedFilter={filter}
        onFilterChange={handleFilterChange}
      />

      {/* 7. 件数・状況表示 (今月出会える出店者さんたち) */}
      <div className="flex items-center justify-between mb-5 px-2">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl">🏪</span>
          <h2 className="text-base sm:text-2xl font-black text-[#2D2622]">
            今月出会える出店者さんたち
          </h2>
          <span className="bg-[#C86D51] text-white font-extrabold text-xs sm:text-sm px-2.5 py-0.5 rounded-full border border-[#2D2622] shadow-2xs">
            {filteredExhibitors.length}件
          </span>
        </div>
      </div>

      {/* 8. 出店者カードグリッド（スマホ横3列配置・一覧性向上） */}
      {loading ? (
        <div className="text-center py-16">
          <p className="text-base sm:text-lg font-bold text-[#59483E] animate-pulse">
            出店者さんの情報を準備中です... 🌱
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-12 max-w-xl mx-auto p-6 bg-amber-50 border-2 border-[#2D2622] rounded-2xl shadow-xs">
          <p className="text-base font-bold text-amber-900">{error}</p>
        </div>
      ) : filteredExhibitors.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-4">
          {filteredExhibitors.map((exhibitor, idx) => (
            <ExhibitorCard
              key={exhibitor.id}
              exhibitor={exhibitor}
              onClick={() => handleCardClick(exhibitor)}
              index={idx}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#FDFBF7] rounded-2xl border-2 border-[#2D2622] p-8 shadow-signboard-lg max-w-md mx-auto">
          <p className="text-base text-[#2D2622] font-bold mb-2">
            お探しの出店者さんが見つかりませんでした 🌾
          </p>
          <p className="text-xs text-[#59483E] mb-4">
            キーワードやカテゴリを変更してお試しください
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilter('ALL');
            }}
            className="text-xs font-extrabold text-white bg-[#C86D51] hover:bg-[#B35C41] px-4 py-2 rounded-full border-2 border-[#2D2622] shadow-signboard cursor-pointer"
          >
            条件をリセットする
          </button>
        </div>
      )}

      {/* 出店者詳細モーダル */}
      <Modal
        exhibitor={selectedExhibitor}
        events={events}
        onClose={handleCloseModal}
        onSelectEvent={handleSelectEventFromModal}
      />

      {/* イベントチラシ（JPG）高解像度拡大表示モーダル / ライトボックス */}
      {activeFlyerUrl && (
        <div
          onClick={() => setActiveFlyerUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xs animate-fade-in cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-[#FDFBF7] rounded-2xl border-2 border-[#2D2622] p-3 sm:p-4 max-w-4xl max-h-[94vh] flex flex-col items-center overflow-hidden shadow-[6px_6px_0px_0px_rgba(45,38,34,1)] animate-slide-up-fade"
          >
            {/* 上部操作バー */}
            <div className="w-full flex items-center justify-between gap-2 pb-2 mb-2 border-b-2 border-stone-200">
              <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-[#2D2622]">
                <span>🖼️</span>
                <span>イベントチラシ (高解像度JPG)</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeFlyerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-white text-[#2D2622] border-2 border-[#2D2622] shadow-signboard hover:bg-[#FAF6F0] flex items-center gap-1"
                >
                  <span>別タブで原寸表示</span>
                  <span>↗</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActiveFlyerUrl(null)}
                  className="w-8 h-8 rounded-full bg-[#FAF6F0] text-[#2D2622] border-2 border-[#2D2622] font-black text-xs flex items-center justify-center shadow-xs hover:bg-rose-100 cursor-pointer"
                  aria-label="閉じる"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* チラシ画像表示 */}
            <div className="relative w-full h-[78vh] flex items-center justify-center bg-stone-100 rounded-xl overflow-hidden border border-stone-300">
              <Image
                src={activeFlyerUrl}
                alt="イベントチラシ高解像度画像"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      )}

      {/* 9. スマホ用 フローティングボタン群 (検索 & 開催日選択) */}
      <aside aria-label="モバイル用絞り込み・検索" className="sm:hidden fixed bottom-5 right-3 z-40 flex flex-col gap-2.5 items-end">
        <button
          type="button"
          onClick={() => setIsMobileSearchOpen(true)}
          aria-label="何をお探しですか？"
          className="w-12 h-12 rounded-full bg-[#FDFBF7] text-[#2D2622] border-2 border-[#2D2622] shadow-signboard active:scale-95 transition-all flex items-center justify-center cursor-pointer font-bold text-lg"
        >
          🔍
        </button>

        <button
          type="button"
          onClick={() => setIsMobileEventFilterOpen(true)}
          aria-label="いつ行く？ 開催日を選ぶ"
          className="w-12 h-12 rounded-full bg-[#C86D51] text-white border-2 border-[#2D2622] shadow-signboard active:scale-95 transition-all flex items-center justify-center cursor-pointer font-bold text-lg"
        >
          🗓️
        </button>
      </aside>

      {/* 10. スマホ用 検索ポップアップ */}
      {isMobileSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsMobileSearchOpen(false)}
        >
          <div
            className="w-full bg-[#FAF6F0] rounded-t-3xl p-5 shadow-2xl border-t-2 border-[#2D2622] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-stone-300 mb-4">
              <h3 className="text-base font-black text-[#2D2622]">何をお探しですか？</h3>
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="w-8 h-8 rounded-full bg-white text-[#2D2622] border-2 border-[#2D2622] font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setIsMobileSearchOpen(false); }}>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="店名やおすすめ商品名..."
                className="w-full px-4 py-3 bg-white border-2 border-[#2D2622] rounded-xl text-sm font-bold text-[#2D2622] mb-4"
              />
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="w-full py-3 bg-[#4A6B5D] text-white font-extrabold text-sm rounded-xl border-2 border-[#2D2622] shadow-signboard"
              >
                検索結果をみる ({filteredExhibitors.length}件)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 11. スマホ用 開催日選択ポップアップ */}
      {isMobileEventFilterOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsMobileEventFilterOpen(false)}
        >
          <div
            className="w-full bg-[#FAF6F0] rounded-t-3xl p-5 shadow-2xl border-t-2 border-[#2D2622] max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-stone-300 mb-4">
              <h3 className="text-base font-black text-[#2D2622]">いつ行く？ 開催日を選ぶ</h3>
              <button
                type="button"
                onClick={() => setIsMobileEventFilterOpen(false)}
                className="w-8 h-8 rounded-full bg-white text-[#2D2622] border-2 border-[#2D2622] font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1 py-1">
              {upcomingEvent && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEventId(upcomingEvent.id);
                    setIsMobileEventFilterOpen(false);
                  }}
                  className={`w-full p-3.5 rounded-xl text-left text-sm font-extrabold transition-all border-2 border-[#2D2622] ${
                    selectedEventId === upcomingEvent.id
                      ? 'bg-[#4A6B5D] text-white shadow-signboard'
                      : 'bg-white text-[#2D2622]'
                  }`}
                >
                  次回 ({upcomingEvent.name})
                </button>
              )}

              {pastEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    setSelectedEventId(ev.id);
                    setIsMobileEventFilterOpen(false);
                  }}
                  className={`w-full p-3 rounded-xl text-left text-sm font-extrabold border-2 border-[#2D2622] ${
                    selectedEventId === ev.id
                      ? 'bg-[#3A3530] text-white shadow-signboard'
                      : 'bg-white text-[#2D2622]'
                  }`}
                >
                  {ev.name}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setSelectedEventId('ALL');
                  setIsMobileEventFilterOpen(false);
                }}
                className={`w-full p-3 rounded-xl text-left text-sm font-extrabold border-2 border-[#2D2622] ${
                  selectedEventId === 'ALL' || selectedEventId === 'INIT'
                    ? 'bg-[#7C6A5D] text-white shadow-signboard'
                    : 'bg-white text-[#2D2622]'
                }`}
              >
                全店舗一覧 (累計)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
