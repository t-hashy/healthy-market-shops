'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { EditRequest } from '../types';

type Props = {
  onSelectExhibitorForEdit?: (exhibitorId: string) => void;
};

export default function EditRequestManager({ onSelectExhibitorForEdit }: Props) {
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  useEffect(() => {
    const q = query(collection(db, 'editRequests'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const list: EditRequest[] = [];
        querySnapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as EditRequest);
        });
        setRequests(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching edit requests:', err);
        setError('修正依頼の取得に失敗しました。Firestoreの権限（セキュリティルール）を確認してください。');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ステータス（未対応 / 対応済み）の切り替え
  const handleToggleStatus = async (request: EditRequest) => {
    const nextStatus = request.status === 'resolved' ? 'pending' : 'resolved';
    try {
      await updateDoc(doc(db, 'editRequests', request.id), {
        status: nextStatus,
      });
    } catch (err) {
      console.error('Error updating status:', err);
      alert('ステータスの更新に失敗しました。');
    }
  };

  // 依頼の削除
  const handleDelete = async (request: EditRequest) => {
    if (!confirm(`店舗「${request.exhibitorName}」への修正依頼を削除します。よろしいですか？`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'editRequests', request.id));
    } catch (err) {
      console.error('Error deleting edit request:', err);
      alert('削除中にエラーが発生しました。');
    }
  };

  const pendingCount = requests.filter((r) => r.status !== 'resolved').length;
  const resolvedCount = requests.filter((r) => r.status === 'resolved').length;

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'pending') return r.status !== 'resolved';
    if (statusFilter === 'resolved') return r.status === 'resolved';
    return true;
  });

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return <p className="text-stone-600">修正依頼を読み込んでいます...</p>;
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800">
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xs border border-stone-200">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">修正・更新依頼管理</h2>
          <div className="flex items-center gap-3 text-sm text-stone-500 mt-1">
            <span>全 {requests.length}件</span>
            <span>•</span>
            <span className="text-rose-600 font-semibold">未対応: {pendingCount}件</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">対応済み: {resolvedCount}件</span>
          </div>
        </div>

        {/* フィルタボタン */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            すべて ({requests.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            未対応 ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'resolved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            対応済み ({resolvedCount})
          </button>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-stone-50 rounded-xl border border-stone-200">
          <svg className="w-12 h-12 mx-auto text-stone-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-stone-500 font-medium">該当する修正依頼はありません。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isResolved = req.status === 'resolved';

            return (
              <div
                key={req.id}
                className={`p-5 rounded-xl border transition-all ${
                  isResolved
                    ? 'bg-stone-50/70 border-stone-200 opacity-80'
                    : 'bg-white border-rose-200 shadow-xs ring-1 ring-rose-100'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* ステータスバッジ & 日時 & 出店者名 */}
                    <div className="flex flex-wrap items-center gap-2.5 mb-2">
                      {isResolved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                          ✓ 対応済み
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-700 animate-pulse">
                          ● 未対応
                        </span>
                      )}
                      <span className="text-xs text-stone-400">{formatDate(req.createdAt)}</span>
                      <span className="text-stone-300">•</span>
                      <span className="text-xs text-stone-500 font-medium">対象店舗:</span>
                      <span className="text-sm font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md">
                        {req.exhibitorName}
                      </span>
                    </div>

                    {/* 依頼者情報 */}
                    <div className="text-xs text-stone-600 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div>
                        <span className="text-stone-400">ご担当:</span>{' '}
                        <span className="font-semibold text-stone-800">{req.requesterName}</span>
                      </div>
                      <div>
                        <span className="text-stone-400">連絡先:</span>{' '}
                        <a href={`mailto:${req.contact}`} className="font-medium text-emerald-700 hover:underline">
                          {req.contact}
                        </a>
                      </div>
                    </div>

                    {/* 依頼内容ボックス */}
                    <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                      <p className="text-xs font-semibold text-stone-500 mb-1">【依頼内容】</p>
                      <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
                        {req.details}
                      </p>
                    </div>
                  </div>

                  {/* 右側アクションボタン群 */}
                  <div className="flex flex-row md:flex-col items-center md:items-end gap-2 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                    {/* 該当出店者を編集 */}
                    {onSelectExhibitorForEdit && (
                      <button
                        type="button"
                        onClick={() => onSelectExhibitorForEdit(req.exhibitorId)}
                        className="w-full sm:w-auto text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3.5 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>この店舗の情報を編集</span>
                      </button>
                    )}

                    {/* 対応ステータストグル */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(req)}
                      className={`w-full sm:w-auto text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border flex items-center justify-center gap-1 cursor-pointer ${
                        isResolved
                          ? 'text-stone-600 bg-stone-100 hover:bg-stone-200 border-stone-300'
                          : 'text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border-emerald-300'
                      }`}
                    >
                      {isResolved ? '未対応に戻す' : '✓ 対応済みにする'}
                    </button>

                    {/* 削除 */}
                    <button
                      type="button"
                      onClick={() => handleDelete(req)}
                      className="text-xs text-stone-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded transition-colors cursor-pointer"
                      title="この修正依頼を削除"
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
  );
}
