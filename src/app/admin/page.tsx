'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import AuthGuard from '@/components/AuthGuard';
import ExhibitorManager from '@/components/ExhibitorManager';
import EditRequestManager from '@/components/EditRequestManager';
import EventManager from '@/components/EventManager';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'exhibitors' | 'events' | 'requests'>('exhibitors');
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [selectedExhibitorIdForEdit, setSelectedExhibitorIdForEdit] = useState<string | null>(null);
  const { user, loading } = useAuth();


  // 未対応の修正依頼件数をリアルタイム監視してバッジに反映
  useEffect(() => {
    if (!user || loading) return;

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
  }, [user, loading]);

  // 修正依頼から「この店舗の情報を編集」を押したときの処理
  const handleSelectExhibitorForEdit = (exhibitorId: string) => {
    setSelectedExhibitorIdForEdit(exhibitorId);
    setActiveTab('exhibitors');
  };

  return (
    <AuthGuard>
      <div className="container mx-auto p-4 sm:p-6 pt-20 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-md border border-emerald-200">
                Admin Console
              </span>
              <span className="text-[11px] text-stone-400">デスクトップ管理画面</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">管理者ダッシュボード</h1>
            
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              開催回の登録（名前順昇順）、出店者の管理・一括参加登録、修正依頼の対応を一元管理します。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="./"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900 shadow-2xs transition-colors"
            >
              <span>🌐 出店者紹介ページを見る</span>
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0l-7 7" />
              </svg>
            </a>
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
