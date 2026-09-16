'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import AuthGuard from '@/components/AuthGuard';
import ExhibitorManager from '@/components/ExhibitorManager';
import EditRequestManager from '@/components/EditRequestManager';
import EventManager from '@/components/EventManager';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'exhibitors' | 'events' | 'requests'>('exhibitors');
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [selectedExhibitorIdForEdit, setSelectedExhibitorIdForEdit] = useState<string | null>(null);

  // 未対応の修正依頼件数をリアルタイム監視してバッジに反映
  useEffect(() => {
    const q = query(collection(db, 'editRequests'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPendingRequestsCount(snapshot.size);
      },
      (err) => {
        console.warn('Could not listen to pending editRequests:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // 修正依頼から「この店舗の情報を編集」を押したときの処理
  const handleSelectExhibitorForEdit = (exhibitorId: string) => {
    setSelectedExhibitorIdForEdit(exhibitorId);
    setActiveTab('exhibitors');
  };

  return (
    <AuthGuard>
      <div className="container mx-auto p-4 sm:p-6 pt-20 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">管理者ダッシュボード</h1>
            <p className="text-sm text-stone-500 mt-1">
              開催回（イベント日・場所）の登録、出店者の管理・一括参加ラベル付け、および修正依頼を管理します。
            </p>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="flex items-center gap-2 border-b border-stone-200 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('exhibitors')}
            className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'exhibitors'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>🏪 出店者マスタ管理</span>
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'events'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>📅 開催回・出店一括登録</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'requests'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>📩 情報の修正・更新依頼</span>
            {pendingRequestsCount > 0 && (
              <span className="bg-rose-500 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* コンテンツエリア */}
        <div>
          <div className={activeTab === 'exhibitors' ? 'block' : 'hidden'}>
            <ExhibitorManager
              editTargetExhibitorId={selectedExhibitorIdForEdit}
              onClearEditTarget={() => setSelectedExhibitorIdForEdit(null)}
            />
          </div>

          <div className={activeTab === 'events' ? 'block' : 'hidden'}>
            <EventManager />
          </div>

          <div className={activeTab === 'requests' ? 'block' : 'hidden'}>
            <EditRequestManager onSelectExhibitorForEdit={handleSelectExhibitorForEdit} />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
