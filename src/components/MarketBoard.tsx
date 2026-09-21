"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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

  // チラシ（JPG画像）の同じタブ内原寸表示ビュー状態 ('front' | 'back' | null)
  const [fullscreenFlyerSide, setFullscreenFlyerSide] = useState<'front' | 'back' | null>(null);
  const [flyerTouchStartX, setFlyerTouchStartX] = useState<number | null>(null);
  const [flyerTouchStartY, setFlyerTouchStartY] = useState<number | null>(null);

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

  // 現在選択中の出店者のインデックス
  const currentExhibitorIndex = useMemo(() => {
    if (!selectedExhibitor) return -1;
    return filteredExhibitors.findIndex((e) => e.id === selectedExhibitor.id);
  }, [filteredExhibitors, selectedExhibitor]);

  // 前の出店者へ移動（ループ対応）
  const handlePrevExhibitor = () => {
    if (filteredExhibitors.length === 0) return;
    if (currentExhibitorIndex > 0) {
      setSelectedExhibitor(filteredExhibitors[currentExhibitorIndex - 1]);
    } else {
      setSelectedExhibitor(filteredExhibitors[filteredExhibitors.length - 1]);
    }
  };

  // 次の出店者へ移動（ループ対応）
  const handleNextExhibitor = () => {
    if (filteredExhibitors.length === 0) return;
    if (currentExhibitorIndex < filteredExhibitors.length - 1) {
      setSelectedExhibitor(filteredExhibitors[currentExhibitorIndex + 1]);
    } else {
      setSelectedExhibitor(filteredExhibitors[0]);
    }
  };

  const handleSelectEventFromModal = (eventId: string) => {
    setSelectedEventId(eventId);
    setSelectedExhibitor(null);
  };

  // チラシ画像URLの動的判定（オモテ面 & ウラ面）
  const flyerFrontUrl = useMemo(() => {
    if (activeEvent?.flyerUrlFront || activeEvent?.flyerUrl || activeEvent?.flyerImageUrl) {
      return activeEvent.flyerUrlFront || activeEvent.flyerUrl || activeEvent.flyerImageUrl;
    }
    if (upcomingEvent?.flyerUrlFront || upcomingEvent?.flyerUrl || upcomingEvent?.flyerImageUrl) {
      return upcomingEvent.flyerUrlFront || upcomingEvent.flyerUrl || upcomingEvent.flyerImageUrl;
    }
    const ev = events.find((e) => e.flyerUrlFront || e.flyerUrl || e.flyerImageUrl);
    return ev?.flyerUrlFront || ev?.flyerUrl || ev?.flyerImageUrl || null;
  }, [activeEvent, upcomingEvent, events]);

  const flyerBackUrl = useMemo(() => {
    if (activeEvent?.flyerUrlBack) return activeEvent.flyerUrlBack;
    if (upcomingEvent?.flyerUrlBack) return upcomingEvent.flyerUrlBack;
    const ev = events.find((e) => e.flyerUrlBack);
    return ev?.flyerUrlBack || null;
  }, [activeEvent, upcomingEvent, events]);

  // チラシのオモテ・ウラ切り替え関数
  const handleToggleFlyerSide = useCallback(() => {
    if (flyerFrontUrl && flyerBackUrl) {
      setFullscreenFlyerSide((prev) => (prev === 'front' ? 'back' : 'front'));
    }
  }, [flyerFrontUrl, flyerBackUrl]);

  // チラシ原寸表示ビュー用のキーボード（Escape / 左右矢印）監視
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullscreenFlyerSide(null);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        handleToggleFlyerSide();
      }
    };
    if (fullscreenFlyerSide) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [fullscreenFlyerSide, handleToggleFlyerSide]);

  // チラシのスワイプ操作ハンドラ
  const handleFlyerTouchStart = (e: React.TouchEvent) => {
    setFlyerTouchStartX(e.touches[0].clientX);
    setFlyerTouchStartY(e.touches[0].clientY);
  };

  const handleFlyerTouchEnd = (e: React.TouchEvent) => {
    if (flyerTouchStartX === null || flyerTouchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - flyerTouchStartX;
    const deltaY = touchEndY - flyerTouchStartY;

    // 水平方向への移動が45px以上、かつ縦移動より顕著な場合にスワイプと判定
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (flyerFrontUrl && flyerBackUrl) {
        if (deltaX > 0) {
          // 右スワイプ: オモテ面へ
          setFullscreenFlyerSide('front');
        } else {
          // 左スワイプ: ウラ面へ
          setFullscreenFlyerSide('back');
        }
      }
    }
    setFlyerTouchStartX(null);
    setFlyerTouchStartY(null);
  };

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
              <span className="font-black text-xs sm:text-base text-[#2D2622] truncate">
                SATOYAMAヘルシーマーケット
              </span>
            </div>
            {/* カテゴリボタン（スリム・手ちぎりマステ風） */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-1">
              {FILTER_CATEGORIES.map((cat, idx) => {
                const isSelected = filter === cat;
                const rotations = ['-rotate-1', 'rotate-1', '-rotate-0.5', 'rotate-1.5', '-rotate-1'];
                const rot = rotations[idx % rotations.length];
                const bgStyles: Record<FilterCategory, { active: string; inactive: string }> = {
                  ALL: { active: 'bg-[#F0C987] text-[#3D250A]', inactive: 'bg-[#F7E1B5]/85 text-[#543818]' },
                  農家: { active: 'bg-[#A7D49B] text-[#1C3E14]', inactive: 'bg-[#C4E6BB]/85 text-[#2A5220]' },
                  飲食: { active: 'bg-[#F5A987] text-[#4A1705]', inactive: 'bg-[#F9C7B2]/85 text-[#6B2A10]' },
                  カフェ: { active: 'bg-[#D8BA9B] text-[#33200F]', inactive: 'bg-[#E6D2BD]/85 text-[#4E341E]' },
                  クラフト: { active: 'bg-[#B4CCE4] text-[#142942]', inactive: 'bg-[#CFDFF0]/85 text-[#234164]' },
                };
                const style = bgStyles[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleFilterChange(cat)}
                    className={`tape-torn-sm px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-black whitespace-nowrap cursor-pointer transition-all duration-200 select-none ${rot} ${
                      isSelected
                        ? `${style.active} shadow-[0_2px_4px_rgba(30,15,5,0.4)] scale-105 ring-1 ring-[#2D2622]/40`
                        : `${style.inactive} shadow-[0_1px_2px_rgba(30,15,5,0.2)] hover:scale-105 hover:-translate-y-0.5 hover:rotate-0`
                    }`}
                  >
                    <span>{CATEGORY_ICONS[cat]}</span>
                    <span className="hidden sm:inline ml-1">{cat === 'ALL' ? 'すべて' : cat}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 1. ヘッダー (ロゴ・見出し: SATOYAMA ヘルシーマーケット) */}
      <header className="text-center mb-6 sm:mb-8 relative select-none">
        <div className="inline-block font-handwriting bg-white/80 backdrop-blur-xs px-4 py-1 rounded-full text-xs sm:text-sm font-black text-[#59483E] border border-[#59483E]/20 mb-2 -rotate-1 shadow-2xs">
          オーガニックパワー いちかい
        </div>
        <h1 className="font-title text-3xl sm:text-5xl md:text-6xl font-black text-[#2D2622] tracking-wide py-1 text-center">
          <span className="inline-block whitespace-nowrap tracking-widest mr-2 sm:mr-3">SATOYAMA</span>
          <span className="relative inline-block whitespace-nowrap">
            <span className="relative z-10">ヘルシーマーケット</span>
            <span aria-hidden="true" className="title-masking-tape" />
          </span>
        </h1>
      </header>

      {/* 2. イベントチラシ（JPG）閲覧セクション & 次回案内（マステ留め紙デザイン） */}
      <div className="mb-8 relative">
        {/* マステ装飾（左右上端） */}
        <div className="absolute -top-2.5 left-6 sm:left-12 w-16 sm:w-24 h-4.5 sm:h-5 masking-tape-amber -rotate-3 z-10 border-dashed border-amber-300/40 pointer-events-none shadow-2xs"></div>
        <div className="absolute -top-2.5 right-6 sm:right-12 w-16 sm:w-24 h-4.5 sm:h-5 masking-tape-green rotate-2 z-10 border-dashed border-emerald-300/40 pointer-events-none shadow-2xs"></div>

        <div className="bg-[#FDFBF7] border-2 border-[#2D2622] rounded-2xl p-4 sm:p-5 shadow-[4px_5px_12px_rgba(40,20,5,0.25)]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* 開催情報 */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
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

            {/* チラシサムネイル & 拡大ボタン（オモテ面・ウラ面対応） */}
            <div className="flex sm:flex-col items-center justify-center gap-2.5 sm:w-64 flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l-2 border-dashed border-stone-200 sm:pl-5">
              {flyerFrontUrl || flyerBackUrl ? (
                <div className="w-full flex items-center gap-2">
                  {/* オモテ面サムネイル */}
                  {flyerFrontUrl && (
                    <div
                      onClick={() => setFullscreenFlyerSide('front')}
                      className="group relative flex-1 h-28 sm:h-32 bg-stone-100 rounded-xl overflow-hidden border-2 border-[#2D2622] cursor-pointer shadow-signboard hover:scale-[1.02] transition-transform"
                    >
                      <Image
                        src={flyerFrontUrl}
                        alt="チラシ（オモテ面）"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#C86D51] text-white text-[9px] font-black rounded shadow-xs z-10">
                        オモテ
                      </div>
                      <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                        <span className="bg-[#FAF6F0] text-[#2D2622] font-black text-[10px] sm:text-xs px-2 py-1 rounded-full border border-[#2D2622] shadow-xs flex items-center gap-0.5">
                          <span>🔍</span>
                          <span>拡大</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ウラ面サムネイル */}
                  {flyerBackUrl && (
                    <div
                      onClick={() => setFullscreenFlyerSide('back')}
                      className="group relative flex-1 h-28 sm:h-32 bg-stone-100 rounded-xl overflow-hidden border-2 border-[#2D2622] cursor-pointer shadow-signboard hover:scale-[1.02] transition-transform"
                    >
                      <Image
                        src={flyerBackUrl}
                        alt="チラシ（ウラ面）"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#4A6B5D] text-white text-[9px] font-black rounded shadow-xs z-10">
                        ウラ
                      </div>
                      <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                        <span className="bg-[#FAF6F0] text-[#2D2622] font-black text-[10px] sm:text-xs px-2 py-1 rounded-full border border-[#2D2622] shadow-xs flex items-center gap-0.5">
                          <span>🔍</span>
                          <span>拡大</span>
                        </span>
                      </div>
                    </div>
                  )}
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

      

      {/* 4. ペタペタ貼られた複数枚のマステ下地の上に書かれたメッセージ */}
      <div className="max-w-2xl mx-auto my-7 sm:my-10 px-3 sm:px-4 select-none relative">
        {/* 背景：同じ太さの手ちぎりマステを複数枚、無造作に最小限重ね貼りした下地 */}
        <div aria-hidden="true" className="absolute inset-0 -left-2 -right-2 sm:-left-4 sm:-right-4 -top-1 -bottom-1 pointer-events-none z-0">
          <div
            className="tape-strip-base tape-torn-var1"
            style={{
              top: '0%',
              height: '19%',
              left: '-1%',
              width: '102%',
              backgroundColor: '#f7d46d',
              transform: 'rotate(-0.5deg)',
              zIndex: 1,
            }}
          />
          <div
            className="tape-strip-base tape-torn-var2"
            style={{
              top: '17%',
              height: '19%',
              left: '0.5%',
              width: '101%',
              backgroundColor: '#f7d46d',
              transform: 'rotate(0.4deg)',
              zIndex: 2,
            }}
          />
          <div
            className="tape-strip-base tape-torn-var3"
            style={{
              top: '34%',
              height: '19%',
              left: '-1.5%',
              width: '102.5%',
              backgroundColor: '#f7d46d',
              transform: 'rotate(-0.3deg)',
              zIndex: 3,
            }}
          />
          <div
            className="tape-strip-base tape-torn-var1"
            style={{
              top: '51%',
              height: '19%',
              left: '0%',
              width: '101.5%',
              backgroundColor: '#f7d46d',
              transform: 'rotate(0.5deg)',
              zIndex: 4,
            }}
          />
          <div
            className="tape-strip-base tape-torn-var2"
            style={{
              top: '68%',
              height: '19%',
              left: '-1%',
              width: '102.5%',
              backgroundColor: '#f7d46d',
              transform: 'rotate(-0.4deg)',
              zIndex: 5,
            }}
          />
          <div
            className="tape-strip-base tape-torn-var3"
            style={{
              top: '84%',
              height: '19%',
              left: '0.5%',
              width: '101%',
              backgroundColor: '#f7d46d',
              transform: 'rotate(0.3deg)',
              zIndex: 6,
            }}
          />
        </div>

        {/* 文字コンテンツ（マステ下地の上に直接書かれた佇まい） */}
        <div className="relative z-10 py-5 sm:py-7 px-3 sm:px-6 text-center">
          <h2 className="font-title text-lg sm:text-2xl md:text-3xl font-black text-[#26170E] leading-snug sm:leading-relaxed tracking-wide flex flex-wrap justify-center items-center gap-x-2 gap-y-1">
            <span className="inline-block whitespace-nowrap">こだわりの食べ物と手作りのぬくもりが集まる</span>
            <span className="inline-block whitespace-nowrap">小さなマーケットです</span>
          </h2>
          <p className="font-sans text-xs sm:text-sm md:text-base font-medium text-[#3A2414] mt-3 sm:mt-4 leading-relaxed max-w-xl mx-auto">
            有機農家の新鮮な野菜、地元野菜を使ったご飯、ていねいに焼き上げたパンや焼き菓子、心を込めたハンドメイド作品。出店者さんとの会話を楽しみながら、お気に入りを見つけに来てください。
          </p>
        </div>
      </div>

      {/* 7. 出店者さんたち専用コルクボードセクション */}
      <section
        className="corkboard-frame rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 relative my-8 sm:my-12 shadow-2xl overflow-visible"
        style={{
          backgroundColor: '#b87b44',
          backgroundImage: `
            radial-gradient(ellipse at 50% 50%, rgba(220, 175, 115, 0.45) 0%, rgba(145, 95, 45, 0.5) 100%),
            radial-gradient(circle at 15% 25%, rgba(70, 35, 10, 0.35) 2px, transparent 2.5px),
            radial-gradient(circle at 72% 60%, rgba(60, 30, 10, 0.4) 1.5px, transparent 2px),
            radial-gradient(circle at 38% 78%, rgba(255, 235, 195, 0.5) 2.5px, transparent 3px),
            radial-gradient(circle at 88% 18%, rgba(255, 235, 195, 0.45) 2px, transparent 2.5px),
            radial-gradient(circle at 25% 85%, rgba(80, 45, 15, 0.3) 2px, transparent 2.5px),
            radial-gradient(circle at 55% 32%, rgba(60, 30, 10, 0.35) 2.5px, transparent 3px)
          `,
          backgroundSize: '100% 100%, 31px 37px, 43px 41px, 47px 53px, 37px 29px, 59px 61px, 23px 31px',
          border: '14px solid #4a2c11',
          boxShadow: 'inset 0 0 60px rgba(40, 15, 0, 0.7), inset 0 0 15px rgba(20, 10, 0, 0.6), 0 16px 36px -6px rgba(40, 20, 5, 0.5), 0 0 0 2px #2d1808',
        }}
      >
        {/* コルクボードの吊り下げ金具装飾（上部左右） */}
        <div className="absolute -top-6 left-10 sm:left-14 hidden sm:flex flex-col items-center pointer-events-none">
          <div className="w-5 h-5 rounded-full border-2 border-[#8C6D46] bg-[#5C4028] shadow-xs"></div>
          <div className="w-2 h-2.5 bg-[#3D2513]"></div>
        </div>
        <div className="absolute -top-6 right-10 sm:right-14 hidden sm:flex flex-col items-center pointer-events-none">
          <div className="w-5 h-5 rounded-full border-2 border-[#8C6D46] bg-[#5C4028] shadow-xs"></div>
          <div className="w-2 h-2.5 bg-[#3D2513]"></div>
        </div>

        {/* コルクボードの見出し（焦がした木板に白文字 ＆ コルクボードに鉄釘で打ち付けられたデザイン） */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 px-1 select-none">
          <div className="relative inline-flex items-center gap-2.5 sm:gap-4 burnt-wood-sign px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg -rotate-0.5">
            {/* コルクボードに打ち付けられた無骨な黒鉄釘（左） */}
            <div className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#1A1816] border border-[#423E3A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center flex-shrink-0">
              <div className="w-1.5 h-0.5 bg-[#080706] rotate-45"></div>
            </div>

            {/* 焦がした木肌に白ペイント・チョークで書かれたような見出し文字 */}
            <h2 className="font-title text-lg sm:text-2xl md:text-3xl font-black tracking-wider text-[#FAF5EB] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              出店者さんたち
            </h2>

            {/* 漆黒プレートの店舗数バッジ */}
            <span className="text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full bg-[#0D0703]/90 text-[#FCEBD2] border border-[#52331C] shadow-inner">
              {filteredExhibitors.length}店舗
            </span>

            {/* コルクボードに打ち付けられた無骨な黒鉄釘（右） */}
            <div className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#1A1816] border border-[#423E3A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center flex-shrink-0">
              <div className="w-1.5 h-0.5 bg-[#080706] -rotate-45"></div>
            </div>
          </div>
        </div>

        {/* コルクボード内に貼られた、手ちぎりマステのカテゴリフィルター */}
        <div className="mb-4 sm:mb-6">
          <FilterBar
            selectedFilter={filter}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* 8. 出店者カードグリッド（マステで貼られたメモ用紙カードたち） */}
        {loading ? (
          <div className="text-center py-16">
            <p className="text-base sm:text-lg font-bold chalk-text animate-pulse">
              出店者さんの情報を準備中です...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-12 max-w-xl mx-auto p-6 bg-amber-50 border-2 border-[#2D2622] rounded-2xl shadow-xs">
            <p className="text-base font-bold text-amber-900">{error}</p>
          </div>
        ) : filteredExhibitors.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-4 md:gap-5">
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
              お探しの出店者さんが見つかりませんでした
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
      </section>

      {/* 出店者詳細モーダル（横スワイプ・横矢印ナビゲーション対応） */}
      <Modal
        exhibitor={selectedExhibitor}
        events={events}
        onClose={handleCloseModal}
        onSelectEvent={handleSelectEventFromModal}
        onPrevExhibitor={handlePrevExhibitor}
        onNextExhibitor={handleNextExhibitor}
        currentIndex={currentExhibitorIndex >= 0 ? currentExhibitorIndex : undefined}
        totalCount={filteredExhibitors.length}
      />

      {/* イベントチラシ（JPG）同じタブでの原寸表示ビュー（戻るボタン＆オモテウラ切り替え付き） */}
      {fullscreenFlyerSide && (
        <div
          onTouchStart={handleFlyerTouchStart}
          onTouchEnd={handleFlyerTouchEnd}
          className="fixed inset-0 z-50 bg-[#2D2622]/95 backdrop-blur-md overflow-y-auto animate-fade-in select-none"
        >
          {/* PC・スマホ両用: 画面左右のフローティング切り替え矢印ボタン */}
          {flyerFrontUrl && flyerBackUrl && (
            <>
              <button
                type="button"
                onClick={handleToggleFlyerSide}
                className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#FAF6F0] text-[#2D2622] border-2 border-[#2D2622] shadow-signboard-lg hover:scale-110 active:scale-95 transition-all flex items-center justify-center font-black text-2xl sm:text-3xl cursor-pointer z-50 group"
                aria-label="チラシの裏表を切り替える"
                title="裏表を切り替える (←キーまたはスワイプ)"
              >
                <span>‹</span>
              </button>
              <button
                type="button"
                onClick={handleToggleFlyerSide}
                className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#FAF6F0] text-[#2D2622] border-2 border-[#2D2622] shadow-signboard-lg hover:scale-110 active:scale-95 transition-all flex items-center justify-center font-black text-2xl sm:text-3xl cursor-pointer z-50 group"
                aria-label="チラシの裏表を切り替える"
                title="裏表を切り替える (→キーまたはスワイプ)"
              >
                <span>›</span>
              </button>
            </>
          )}

          {/* 上部固定ナビゲーションバー */}
          <div className="sticky top-0 z-40 bg-[#FAF6F0]/95 backdrop-blur-md border-b-2 border-[#2D2622] px-3 sm:px-6 py-3 shadow-md">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
              {/* ← 戻るボタン */}
              <button
                type="button"
                onClick={() => setFullscreenFlyerSide(null)}
                className="btn-handmade px-3.5 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-black text-[#2D2622] bg-white hover:bg-amber-100 border-2 border-[#2D2622] shadow-signboard hover:shadow-signboard-lg cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <span className="text-base sm:text-lg">←</span>
                <span>戻る</span>
              </button>

              {/* オモテ面・ウラ面の切り替えタブ（両面存在する場合） */}
              {flyerFrontUrl && flyerBackUrl ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 sm:gap-2 bg-stone-200/80 p-1 rounded-full border border-stone-300">
                    <button
                      type="button"
                      onClick={() => setFullscreenFlyerSide('front')}
                      className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-black transition-all cursor-pointer ${
                        fullscreenFlyerSide === 'front'
                          ? 'bg-[#C86D51] text-white shadow-xs'
                          : 'text-stone-700 hover:text-stone-900'
                      }`}
                    >
                      オモテ面 (1/2)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFullscreenFlyerSide('back')}
                      className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-black transition-all cursor-pointer ${
                        fullscreenFlyerSide === 'back'
                          ? 'bg-[#4A6B5D] text-white shadow-xs'
                          : 'text-stone-700 hover:text-stone-900'
                      }`}
                    >
                      ウラ面 (2/2)
                    </button>
                  </div>
                  <span className="text-[10px] text-stone-500 hidden md:inline">
                    (横スワイプ・矢印キー切替可)
                  </span>
                </div>
              ) : (
                <div className="text-xs sm:text-sm font-black text-[#2D2622]">
                  {fullscreenFlyerSide === 'front' ? 'イベントチラシ（オモテ面）' : 'イベントチラシ（ウラ面）'}
                </div>
              )}

              {/* 閉じるアイコン */}
              <button
                type="button"
                onClick={() => setFullscreenFlyerSide(null)}
                className="w-9 h-9 rounded-full bg-white text-[#2D2622] border-2 border-[#2D2622] font-black text-sm flex items-center justify-center shadow-xs hover:bg-rose-100 cursor-pointer transition-colors"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
          </div>

          {/* チラシ画像本体（原寸サイズ表示で縦スクロールして細部まで読める） */}
          <div className="max-w-5xl mx-auto p-3 sm:p-6 pb-24">
            <div className="relative bg-[#FAF6F0] rounded-2xl border-2 border-[#2D2622] p-2 sm:p-4 shadow-2xl flex flex-col items-center">
              {fullscreenFlyerSide === 'front' && flyerFrontUrl && (
                <div className="w-full">
                  <img
                    src={flyerFrontUrl}
                    alt="イベントチラシ（オモテ面）原寸"
                    className="w-full h-auto rounded-xl object-contain mx-auto shadow-md"
                  />
                </div>
              )}
              {fullscreenFlyerSide === 'back' && flyerBackUrl && (
                <div className="w-full">
                  <img
                    src={flyerBackUrl}
                    alt="イベントチラシ（ウラ面）原寸"
                    className="w-full h-auto rounded-xl object-contain mx-auto shadow-md"
                  />
                </div>
              )}

              {/* 下部ナビゲーション（スクロール後にすぐに戻れる） */}
              <div className="mt-6 pt-4 border-t-2 border-dashed border-stone-300 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
                {flyerFrontUrl && flyerBackUrl && (
                  <button
                    type="button"
                    onClick={handleToggleFlyerSide}
                    className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-black bg-stone-100 hover:bg-stone-200 text-[#2D2622] border-2 border-[#2D2622] shadow-signboard cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🔄</span>
                    <span>{fullscreenFlyerSide === 'front' ? 'ウラ面を見る (2/2) →' : '← オモテ面を見る (1/2)'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFullscreenFlyerSide(null)}
                  className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-black text-white bg-[#C86D51] hover:bg-[#B35C41] border-2 border-[#2D2622] shadow-signboard cursor-pointer flex items-center gap-1.5"
                >
                  <span>←</span>
                  <span>トップページに戻る</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    

     
    </div>
  );
}
