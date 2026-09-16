'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Exhibitor, MarketEvent, CATEGORY_STYLES, getExhibitorCategories } from '../types';

export default function EventManager() {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingExhibitors, setLoadingExhibitors] = useState(true);

  // 選択中の開催回ID（一括登録の対象）
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // 開催回編集用モーダル状態
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<MarketEvent | null>(null);
  const [eventFormData, setEventFormData] = useState<Partial<MarketEvent>>({
    name: '',
    date: '',
    location: '',
    isUpcoming: false,
  });
  const [eventModalError, setEventModalError] = useState<string | null>(null);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  // 一括操作用チェックボックス状態 (exhibitorId -> boolean)
  const [selectedExhibitorMap, setSelectedExhibitorMap] = useState<Record<string, boolean>>({});
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [batchMessage, setBatchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // フィルタ・検索
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterParticipation, setFilterParticipation] = useState<'all' | 'joined' | 'not_joined'>('all');

  // 1. 開催回データのリアルタイム購読
  useEffect(() => {
    const q = query(collection(db, 'marketEvents'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: MarketEvent[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as MarketEvent);
        });
        setEvents(list);
        setLoadingEvents(false);

        // まだ選択されていなければ「次回」イベントまたは先頭のイベントを選択
        setSelectedEventId((prev) => {
          if (prev && list.some((e) => e.id === prev)) return prev;
          const upcoming = list.find((e) => e.isUpcoming);
          return upcoming ? upcoming.id : list[0]?.id || '';
        });
      },
      (err) => {
        console.error('Error fetching marketEvents:', err);
        setLoadingEvents(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. 出店者データのリアルタイム購読
  useEffect(() => {
    const q = query(collection(db, 'exhibitors'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Exhibitor[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Exhibitor);
        });
        setExhibitors(list);
        setLoadingExhibitors(false);
      },
      (err) => {
        console.error('Error fetching exhibitors:', err);
        setLoadingExhibitors(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 選択中のイベント
  const activeEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  // 選択中イベントが変わったら、そのイベントに参加している店舗を初期チェック状態にする
  useEffect(() => {
    if (!selectedEventId) {
      setSelectedExhibitorMap({});
      return;
    }
    const map: Record<string, boolean> = {};
    for (const ex of exhibitors) {
      if (Array.isArray(ex.eventIds) && ex.eventIds.includes(selectedEventId)) {
        map[ex.id] = true;
      }
    }
    setSelectedExhibitorMap(map);
  }, [selectedEventId, exhibitors]);

  // 開催回作成・編集モーダルを開く
  const handleOpenEventModal = (event?: MarketEvent) => {
    if (event) {
      setEventToEdit(event);
      setEventFormData({
        name: event.name,
        date: event.date,
        location: event.location,
        isUpcoming: !!event.isUpcoming,
      });
    } else {
      setEventToEdit(null);
      setEventFormData({
        name: '',
        date: '',
        location: '',
        isUpcoming: events.length === 0, // 初回なら自動で次回ON
      });
    }
    setEventModalError(null);
    setIsEventModalOpen(true);
  };

  // 開催回の保存
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventFormData.name?.trim()) {
      setEventModalError('開催回名を入力してください。');
      return;
    }
    if (!eventFormData.date?.trim()) {
      setEventModalError('開催日を入力してください。');
      return;
    }
    if (!eventFormData.location?.trim()) {
      setEventModalError('開催場所を入力してください。');
      return;
    }

    setIsSubmittingEvent(true);
    setEventModalError(null);

    try {
      const isUpcoming = !!eventFormData.isUpcoming;

      // もしこの回を「次回開催」にする場合、他の全回の isUpcoming を false に更新
      if (isUpcoming) {
        const batch = writeBatch(db);
        events.forEach((ev) => {
          if (ev.id !== eventToEdit?.id && ev.isUpcoming) {
            batch.update(doc(db, 'marketEvents', ev.id), { isUpcoming: false });
          }
        });
        await batch.commit();
      }

      if (eventToEdit) {
        await updateDoc(doc(db, 'marketEvents', eventToEdit.id), {
          name: eventFormData.name.trim(),
          date: eventFormData.date.trim(),
          location: eventFormData.location.trim(),
          isUpcoming,
        });
      } else {
        const newDoc = await addDoc(collection(db, 'marketEvents'), {
          name: eventFormData.name.trim(),
          date: eventFormData.date.trim(),
          location: eventFormData.location.trim(),
          isUpcoming,
          createdAt: new Date().toISOString(),
        });
        setSelectedEventId(newDoc.id);
      }

      setIsEventModalOpen(false);
    } catch (err: unknown) {
      console.error('Error saving market event:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setEventModalError(`保存に失敗しました: ${msg}`);
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  // 開催回の削除
  const handleDeleteEvent = async (event: MarketEvent) => {
    if (
      !confirm(
        `開催回「${event.name}」を削除しますか？\n出店者データからこの回の参加ラベルも解除されます。`
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'marketEvents', event.id));
      // 出店者の eventIds からもこの event.id を削除
      const batch = writeBatch(db);
      let count = 0;
      exhibitors.forEach((ex) => {
        if (Array.isArray(ex.eventIds) && ex.eventIds.includes(event.id)) {
          const nextEventIds = ex.eventIds.filter((id) => id !== event.id);
          batch.update(doc(db, 'exhibitors', ex.id), { eventIds: nextEventIds });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('削除中にエラーが発生しました。');
    }
  };

  // 開催回をワンクリックで次回に設定
  const handleSetAsUpcoming = async (targetEvent: MarketEvent) => {
    try {
      const batch = writeBatch(db);
      events.forEach((ev) => {
        batch.update(doc(db, 'marketEvents', ev.id), {
          isUpcoming: ev.id === targetEvent.id,
        });
      });
      await batch.commit();
    } catch (err) {
      console.error('Error setting upcoming event:', err);
      alert('設定に失敗しました。');
    }
  };

  // チェックボックスのトグル
  const handleToggleExhibitorCheck = (exhibitorId: string) => {
    setSelectedExhibitorMap((prev) => ({
      ...prev,
      [exhibitorId]: !prev[exhibitorId],
    }));
  };

  // 全選択・全解除（表示中の出店者に対して）
  const handleToggleSelectAll = (check: boolean) => {
    const nextMap = { ...selectedExhibitorMap };
    filteredExhibitors.forEach((ex) => {
      if (check) {
        nextMap[ex.id] = true;
      } else {
        delete nextMap[ex.id];
      }
    });
    setSelectedExhibitorMap(nextMap);
  };

  // 一括保存（選択された開催回に対する出店者ラベル付けを保存）
  const handleSaveBatchParticipation = async () => {
    if (!selectedEventId) {
      alert('対象の開催回を選択してください。');
      return;
    }

    setIsSavingBatch(true);
    setBatchMessage(null);

    try {
      const batch = writeBatch(db);
      let updatedCount = 0;

      for (const ex of exhibitors) {
        const currentEventIds = Array.isArray(ex.eventIds) ? [...ex.eventIds] : [];
        const shouldParticipate = !!selectedExhibitorMap[ex.id];
        const isCurrentlyParticipating = currentEventIds.includes(selectedEventId);

        if (shouldParticipate && !isCurrentlyParticipating) {
          // 追加
          currentEventIds.push(selectedEventId);
          batch.update(doc(db, 'exhibitors', ex.id), { eventIds: currentEventIds });
          updatedCount++;
        } else if (!shouldParticipate && isCurrentlyParticipating) {
          // 削除
          const nextEventIds = currentEventIds.filter((id) => id !== selectedEventId);
          batch.update(doc(db, 'exhibitors', ex.id), { eventIds: nextEventIds });
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
      }

      setBatchMessage({
        type: 'success',
        text: `「${activeEvent?.name}」の出店者一覧を更新しました！（${updatedCount}件の店舗情報を更新）`,
      });
      setTimeout(() => setBatchMessage(null), 5000);
    } catch (err: unknown) {
      console.error('Error batch updating participation:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setBatchMessage({
        type: 'error',
        text: `保存中にエラーが発生しました: ${msg}`,
      });
    } finally {
      setIsSavingBatch(false);
    }
  };

  // フィルタ・検索処理
  const filteredExhibitors = useMemo(() => {
    return exhibitors.filter((ex) => {
      const isChecked = !!selectedExhibitorMap[ex.id];

      // 参加状態フィルタ
      if (filterParticipation === 'joined' && !isChecked) return false;
      if (filterParticipation === 'not_joined' && isChecked) return false;

      // 検索キーワード
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchName = ex.name.toLowerCase().includes(kw);
        const matchCats = getExhibitorCategories(ex).some((c) => c.toLowerCase().includes(kw));
        return matchName || matchCats;
      }
      return true;
    });
  }, [exhibitors, selectedExhibitorMap, filterParticipation, searchKeyword]);

  const currentlyCheckedCount = useMemo(() => {
    return Object.values(selectedExhibitorMap).filter(Boolean).length;
  }, [selectedExhibitorMap]);

  if (loadingEvents || loadingExhibitors) {
    return <p className="text-stone-600">データを読み込んでいます...</p>;
  }

  return (
    <div className="space-y-8">
      {/* 1. 開催回（イベント）の一覧と次回設定セクション */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">開催回の管理</h2>
            <p className="text-sm text-stone-500 mt-1">
              毎回の開催日・開催場所の登録や、トップページに表示する「次回開催」の指定を行えます。
            </p>
          </div>
          <button
            onClick={() => handleOpenEventModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            新しい開催回を追加
          </button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-8 bg-stone-50 rounded-xl border border-stone-200">
            <p className="text-stone-500 text-sm mb-3">開催回がまだ登録されていません。</p>
            <button
              onClick={() => handleOpenEventModal()}
              className="text-xs bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-700"
            >
              ＋ 最初の開催回を登録する
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((ev) => {
              const count = exhibitors.filter(
                (ex) => Array.isArray(ex.eventIds) && ex.eventIds.includes(ev.id)
              ).length;
              const isSelected = ev.id === selectedEventId;

              return (
                <div
                  key={ev.id}
                  className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                    ev.isUpcoming
                      ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-400/30'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  } ${isSelected ? 'shadow-md' : 'shadow-xs'}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-base text-stone-900">{ev.name}</h3>
                      {ev.isUpcoming ? (
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 shadow-xs">
                          ★ 次回開催
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetAsUpcoming(ev)}
                          className="text-[10px] text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 border border-stone-200 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                          title="この回を次回開催回としてトップページに指定"
                        >
                          次回に設定
                        </button>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-stone-600 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-400">📅</span>
                        <span className="font-medium">{ev.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-400">📍</span>
                        <span>{ev.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1 text-stone-500">
                        <span className="text-stone-400">🏪</span>
                        <span>
                          出店登録店舗: <strong className="text-stone-900">{count}</strong> 店
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-stone-200/80 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      {isSelected ? '出店者を編集中' : '出店者を一括編集'}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEventModal(ev)}
                        className="text-stone-500 hover:text-stone-800 p-1 hover:bg-stone-100 rounded"
                        title="開催回情報を編集"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev)}
                        className="text-stone-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded"
                        title="開催回を削除"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. 出店者の一括ラベル付け（参加登録）セクション */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-stone-200">
        {/* タイトルとセレクター */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-stone-900">出店者の一括ラベル付け</h2>
              {activeEvent?.isUpcoming && (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  次回開催回
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              対象の開催回を選び、チェックボックスで出店者を複数選択して一括登録できます。
            </p>
          </div>

          {/* 対象開催回の切り替えセレクター */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-stone-600 flex-shrink-0">対象開催回:</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="text-sm border border-stone-300 rounded-xl px-3 py-2 bg-white text-stone-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-xs"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} {ev.isUpcoming ? '★ (次回)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 選択中のイベントサマリー & 一括保存ボタンバー */}
        {activeEvent && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl mb-6">
            <div>
              <div className="flex items-center gap-2 font-bold text-stone-900 text-base">
                <span>{activeEvent.name}</span>
                <span className="text-xs font-normal text-stone-500">
                  （{activeEvent.date} @ {activeEvent.location}）
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-1">
                現在チェック中: <strong className="text-emerald-700 text-sm">{currentlyCheckedCount}</strong> 店舗 / 全 {exhibitors.length} 店舗
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveBatchParticipation}
              disabled={isSavingBatch}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSavingBatch ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>保存中...</span>
                </>
              ) : (
                <span>✓ この回の出店者リストを一括保存</span>
              )}
            </button>
          </div>
        )}

        {batchMessage && (
          <div
            className={`p-3.5 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 animate-fade-in ${
              batchMessage.type === 'success'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-rose-100 text-rose-800 border border-rose-300'
            }`}
          >
            {batchMessage.type === 'success' ? '✓' : '⚠️'} {batchMessage.text}
          </div>
        )}

        {/* 絞り込み & 全選択コントロールバー */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 p-3 bg-stone-50 rounded-xl border border-stone-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-stone-500 mr-1">絞り込み:</span>
            <button
              onClick={() => setFilterParticipation('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filterParticipation === 'all'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-300'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              すべて ({exhibitors.length})
            </button>
            <button
              onClick={() => setFilterParticipation('joined')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filterParticipation === 'joined'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              参加チェックあり ({currentlyCheckedCount})
            </button>
            <button
              onClick={() => setFilterParticipation('not_joined')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filterParticipation === 'not_joined'
                  ? 'bg-stone-700 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-200/60'
              }`}
            >
              未チェック ({exhibitors.length - currentlyCheckedCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleSelectAll(true)}
              className="text-xs text-emerald-700 hover:text-emerald-900 bg-white border border-stone-300 hover:border-emerald-500 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              表示中を全選択
            </button>
            <button
              type="button"
              onClick={() => handleToggleSelectAll(false)}
              className="text-xs text-stone-600 hover:text-stone-900 bg-white border border-stone-300 hover:bg-stone-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              全解除
            </button>
            <div className="relative w-48">
              <input
                type="text"
                placeholder="店名検索..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white"
              />
              <svg
                className="w-3.5 h-3.5 text-stone-400 absolute left-2 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 出店者テーブル */}
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <span className="sr-only">選択</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  出店者
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  カテゴリ
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  過去の出店歴
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  参加状況
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-200">
              {filteredExhibitors.map((exhibitor) => {
                const isChecked = !!selectedExhibitorMap[exhibitor.id];
                const cats = getExhibitorCategories(exhibitor);
                const pastCount = Array.isArray(exhibitor.eventIds) ? exhibitor.eventIds.length : 0;

                return (
                  <tr
                    key={exhibitor.id}
                    onClick={() => handleToggleExhibitorCheck(exhibitor.id)}
                    className={`cursor-pointer transition-colors ${
                      isChecked ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-stone-50'
                    }`}
                  >
                    {/* チェックボックス */}
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleExhibitorCheck(exhibitor.id)}
                        className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>

                    {/* 店舗名 */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-bold text-stone-900">{exhibitor.name}</div>
                      {exhibitor.isHidden && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          非表示中
                        </span>
                      )}
                    </td>

                    {/* カテゴリ */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {cats.map((c) => {
                          const style = CATEGORY_STYLES[c];
                          return (
                            <span
                              key={c}
                              className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                                style ? `${style.badgeBg} ${style.badgeText}` : 'bg-stone-100 text-stone-700'
                              }`}
                            >
                              #{c}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* 過去出店歴 */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-stone-600">
                      <span>累計 {pastCount} 回参加</span>
                    </td>

                    {/* 参加ステータスバッジ */}
                    <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                      {isChecked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                          ✓ 出店予定
                        </span>
                      ) : (
                        <span className="text-stone-400 font-medium">未登録</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredExhibitors.length === 0 && (
          <p className="text-center text-stone-500 py-8 text-xs">該当する出店者が見つかりません。</p>
        )}
      </div>

      {/* 開催回追加・編集モーダル */}
      {isEventModalOpen && (
        <div
          onClick={() => setIsEventModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-slide-up-fade"
          >
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-stone-100">
              <h3 className="text-lg font-bold text-stone-900">
                {eventToEdit ? '開催回の編集' : '新しい開催回の追加'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  開催回名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 第15回 ヘルシーマーケット（2026秋）"
                  value={eventFormData.name || ''}
                  onChange={(e) => setEventFormData({ ...eventFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  開催日時 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 2026年10月18日(日) 10:00〜16:00"
                  value={eventFormData.date || ''}
                  onChange={(e) => setEventFormData({ ...eventFormData, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  開催場所 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 世田谷公園 けやき広場"
                  value={eventFormData.location || ''}
                  onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-stone-900"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                <div>
                  <label htmlFor="isUpcoming" className="text-xs font-bold text-stone-800 block cursor-pointer">
                    次回開催回として設定する
                  </label>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    トップページ上部にこの開催情報が告知されます。
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="isUpcoming"
                  checked={!!eventFormData.isUpcoming}
                  onChange={(e) => setEventFormData({ ...eventFormData, isUpcoming: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {eventModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {eventModalError}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  disabled={isSubmittingEvent}
                  className="py-2 px-4 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEvent}
                  className="py-2 px-5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow flex items-center gap-1.5"
                >
                  {isSubmittingEvent ? '保存中...' : '保存する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
