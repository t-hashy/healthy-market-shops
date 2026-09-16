'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../utils/firebase';
import {
  Exhibitor,
  MarketEvent,
  CATEGORY_STYLES,
  getExhibitorCategories,
  getExhibitorImages,
  getExhibitorLinks,
  getExhibitorEvents,
} from '../types';
import ExhibitorForm from './ExhibitorForm';

type Props = {
  editTargetExhibitorId?: string | null;
  onClearEditTarget?: () => void;
};

export default function ExhibitorManager({ editTargetExhibitorId, onClearEditTarget }: Props = {}) {
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [exhibitorToEdit, setExhibitorToEdit] = useState<Exhibitor | null>(null);
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'visible' | 'hidden'>('all');
  const [filterEventId, setFilterEventId] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'exhibitors'), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const exhibitorsData: Exhibitor[] = [];
      querySnapshot.forEach((doc) => {
        exhibitorsData.push({ id: doc.id, ...doc.data() } as Exhibitor);
      });
      setExhibitors(exhibitorsData);
      setError(null);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching exhibitors in real-time: ", err);
      setError("出店者データの取得に失敗しました。Firestoreの権限（セキュリティルール）を確認してください。");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 開催回データの取得
  useEffect(() => {
    const q = query(collection(db, 'marketEvents'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: MarketEvent[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as MarketEvent));
        setEvents(list);
      },
      (err) => {
        console.warn('Error fetching marketEvents:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  // 外部からの編集対象指定（修正依頼から「編集」が押された時など）
  useEffect(() => {
    if (editTargetExhibitorId && exhibitors.length > 0) {
      const target = exhibitors.find((e) => e.id === editTargetExhibitorId);
      if (target) {
        setExhibitorToEdit(target);
        setIsFormOpen(true);
      }
    }
  }, [editTargetExhibitorId, exhibitors]);

  const handleAddNew = () => {
    setExhibitorToEdit(null);
    setIsFormOpen(true);
  };

  const handleEdit = (exhibitor: Exhibitor) => {
    setExhibitorToEdit(exhibitor);
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setExhibitorToEdit(null);
    if (onClearEditTarget) {
      onClearEditTarget();
    }
  };

  // 表示 / 非表示の切り替え
  const handleToggleVisibility = async (exhibitor: Exhibitor) => {
    const newStatus = !exhibitor.isHidden;
    const actionText = newStatus ? '非表示' : '公開';
    
    try {
      await updateDoc(doc(db, 'exhibitors', exhibitor.id), {
        isHidden: newStatus,
      });
    } catch (err) {
      console.error(`Error changing visibility: `, err);
      alert(`${actionText}への変更中にエラーが発生しました。`);
    }
  };

  // 出店者の完全削除
  const handleDelete = async (exhibitor: Exhibitor) => {
    if (!confirm(`出店者「${exhibitor.name}」の情報を完全に削除します。よろしいですか？\n※この操作は取り消せません。`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'exhibitors', exhibitor.id));
      const imagesToDelete = getExhibitorImages(exhibitor);
      for (const imgUrl of imagesToDelete) {
        try {
          const imageRef = ref(storage, imgUrl);
          await deleteObject(imageRef);
        } catch (storageError: unknown) {
          console.warn(`Could not delete image ${imgUrl}. It might not exist.`, storageError);
        }
      }
    } catch (err) {
      console.error('Error deleting exhibitor: ', err);
      alert('削除中にエラーが発生しました。');
    }
  };

  const filteredExhibitors = exhibitors.filter((ex) => {
    // 表示・非表示フィルタ
    if (filterVisibility === 'visible' && ex.isHidden) return false;
    if (filterVisibility === 'hidden' && !ex.isHidden) return false;

    // 開催回フィルタ
    if (filterEventId !== 'all') {
      if (!Array.isArray(ex.eventIds) || !ex.eventIds.includes(filterEventId)) {
        return false;
      }
    }

    // キーワード検索
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      const matchName = ex.name.toLowerCase().includes(kw);
      const matchCats = getExhibitorCategories(ex).some((c) => c.toLowerCase().includes(kw));
      const matchDesc = ex.description?.toLowerCase().includes(kw) ?? false;
      return matchName || matchCats || matchDesc;
    }
    return true;
  });

  const visibleCount = exhibitors.filter((e) => !e.isHidden).length;
  const hiddenCount = exhibitors.filter((e) => !!e.isHidden).length;

  if (loading) {
    return <p className="text-stone-600">出店者リストを読み込んでいます...</p>;
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800">
        <p className="font-semibold">{error}</p>
        <p className="mt-2 text-sm text-amber-700">
          Firebase Consoleの「Cloud Firestore」&gt;「ルール」でアクセス権限が設定されているか確認してください。
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-stone-200">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">出店者情報管理</h2>
            <div className="flex items-center gap-3 text-sm text-stone-500 mt-1">
              <span>全 {exhibitors.length}件</span>
              <span>•</span>
              <span className="text-emerald-700 font-medium">公開中: {visibleCount}件</span>
              <span>•</span>
              <span className="text-stone-600 font-medium">非表示: {hiddenCount}件</span>
            </div>
          </div>
          <button
            onClick={handleAddNew}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl shadow transition-colors flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            新規出店者を追加
          </button>
        </div>

        {/* 絞り込み & 検索バー */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 p-3 bg-stone-50 rounded-xl border border-stone-200">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-stone-600 mr-1">ステータス:</span>
            <button
              onClick={() => setFilterVisibility('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filterVisibility === 'all'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-300'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-white/60'
              }`}
            >
              すべて ({exhibitors.length})
            </button>
            <button
              onClick={() => setFilterVisibility('visible')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filterVisibility === 'visible'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-100/50'
              }`}
            >
              公開中 ({visibleCount})
            </button>
            <button
              onClick={() => setFilterVisibility('hidden')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filterVisibility === 'hidden'
                  ? 'bg-stone-700 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-200/60'
              }`}
            >
              非表示 ({hiddenCount})
            </button>
            {events.length > 0 && (
              <div className="flex items-center gap-1.5 ml-2 border-l border-stone-200 pl-2">
                <span className="text-xs font-semibold text-stone-500">出店回:</span>
                <select
                  value={filterEventId}
                  onChange={(e) => setFilterEventId(e.target.value)}
                  className="text-xs border border-stone-300 rounded-lg px-2 py-1 bg-white text-stone-800"
                >
                  <option value="all">全開催回</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} {ev.isUpcoming ? '★次回' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="出店者名やキーワードで検索..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-stone-900"
            />
            <svg
              className="w-4 h-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* 一覧テーブル */}
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">出店者</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">ステータス</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">参加出店回</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">カテゴリ</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">データ登録状況</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-stone-500 uppercase tracking-wider">操作（修正・非表示・削除）</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-200">
              {filteredExhibitors.map((exhibitor) => {
                const cats = getExhibitorCategories(exhibitor);
                const imgs = getExhibitorImages(exhibitor);
                const lnks = getExhibitorLinks(exhibitor);
                const exEvents = getExhibitorEvents(exhibitor, events);
                const isHidden = !!exhibitor.isHidden;

                return (
                  <tr
                    key={exhibitor.id}
                    className={`transition-colors ${
                      isHidden ? 'bg-stone-50/75 hover:bg-stone-100/70' : 'hover:bg-emerald-50/20'
                    }`}
                  >
                    {/* 出店者 */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {imgs[0] ? (
                          <div className={`relative w-12 h-12 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200 ${
                            isHidden ? 'grayscale-60 opacity-80' : ''
                          }`}>
                            <Image src={imgs[0]} alt="" fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 text-xs flex-shrink-0">
                            No Img
                          </div>
                        )}
                        <div>
                          <div className={`text-sm font-bold ${isHidden ? 'text-stone-600' : 'text-stone-900'}`}>
                            {exhibitor.name}
                          </div>
                          {exhibitor.description && (
                            <div className="text-xs text-stone-400 truncate max-w-xs mt-0.5">
                              {exhibitor.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ステータス */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {isHidden ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-stone-200 text-stone-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-500"></span>
                          非表示中
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          公開中
                        </span>
                      )}
                    </td>

                    {/* 参加出店回 */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {exEvents.length > 0 ? (
                          exEvents.map((ev) => (
                            <span
                              key={ev.id}
                              className={`px-2 py-0.5 inline-flex text-[11px] font-semibold rounded-md ${
                                ev.isUpcoming
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-stone-100 text-stone-700'
                              }`}
                            >
                              {ev.isUpcoming ? '★ ' : ''}
                              {ev.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-stone-400">未登録</span>
                        )}
                      </div>
                    </td>

                    {/* カテゴリ */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {cats.length > 0 ? (
                          cats.map((c) => {
                            const style = CATEGORY_STYLES[c];
                            return (
                              <span
                                key={c}
                                className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${
                                  style ? `${style.badgeBg} ${style.badgeText}` : 'bg-stone-100 text-stone-700'
                                }`}
                              >
                                #{c}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-stone-400">未設定</span>
                        )}
                      </div>
                    </td>

                    {/* 登録データ */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-stone-600">
                      <div>写真: <span className="font-semibold text-stone-900">{imgs.length}</span>/5枚</div>
                      <div>リンク: <span className="font-semibold text-stone-900">{lnks.length}</span>件</div>
                    </td>

                    {/* アクション */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 修正・編集 */}
                        <button
                          onClick={() => handleEdit(exhibitor)}
                          className="text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200 flex items-center gap-1 cursor-pointer"
                          title="出店者情報を修正"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>修正</span>
                        </button>

                        {/* 非表示 / 再表示 トグル */}
                        <button
                          onClick={() => handleToggleVisibility(exhibitor)}
                          className={`px-3 py-1.5 rounded-lg transition-colors border flex items-center gap-1 cursor-pointer ${
                            isHidden
                              ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300'
                              : 'text-stone-700 bg-stone-100 hover:bg-stone-200 border-stone-300'
                          }`}
                          title={isHidden ? '公開状態に戻す' : '出店者一覧から非表示にする'}
                        >
                          {isHidden ? (
                            <>
                              <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>再表示</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                              <span>非表示</span>
                            </>
                          )}
                        </button>

                        {/* 削除 */}
                        <button
                          onClick={() => handleDelete(exhibitor)}
                          className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors border border-rose-200 cursor-pointer"
                          title="完全に削除"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredExhibitors.length === 0 && !loading && (
          <p className="text-center text-stone-500 py-8">該当する出店者がいません。</p>
        )}
      </div>
      
      <ExhibitorForm 
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        exhibitorToEdit={exhibitorToEdit}
        existingExhibitors={exhibitors}
      />
    </>
  );
}
