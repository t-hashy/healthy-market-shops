'use client';

import { useState, FormEvent } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Exhibitor } from '../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  exhibitor: Exhibitor;
};

export default function EditRequestModal({ isOpen, onClose, exhibitor }: Props) {
  const [requesterName, setRequesterName] = useState('');
  const [contact, setContact] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!requesterName.trim()) {
      setError('お名前またはご担当者名を入力してください。');
      return;
    }
    if (!contact.trim()) {
      setError('ご連絡先（メールアドレスまたは電話番号）を入力してください。');
      return;
    }
    if (!details.trim()) {
      setError('修正・更新したい内容を入力してください。');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'editRequests'), {
        exhibitorId: exhibitor.id,
        exhibitorName: exhibitor.name,
        requesterName: requesterName.trim(),
        contact: contact.trim(),
        details: details.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      setIsSuccess(true);
    } catch (err: unknown) {
      console.error('Error submitting edit request:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`送信に失敗しました: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRequesterName('');
    setContact('');
    setDetails('');
    setError(null);
    setIsSuccess(false);
    onClose();
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 md:p-7 overflow-hidden animate-slide-up-fade"
      >
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-xl font-bold text-stone-900">情報の修正・更新依頼</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              対象店舗: <span className="font-semibold text-emerald-700">{exhibitor.name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-stone-900 mb-2">修正依頼を受け付けました</h4>
            <p className="text-sm text-stone-600 mb-6 leading-relaxed">
              ご依頼内容をマーケット運営事務局に送信しました。<br />
              内容を確認のうえ、順次情報を反映・更新いたします。
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="py-2.5 px-6 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow"
            >
              閉じる
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="requesterName" className="block text-xs font-bold text-stone-700 mb-1">
                お名前・ご担当者名 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="requesterName"
                required
                placeholder="例: 山田 太郎"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-stone-900"
              />
            </div>

            <div>
              <label htmlFor="contact" className="block text-xs font-bold text-stone-700 mb-1">
                ご連絡先 (メールアドレス または 電話番号) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="contact"
                required
                placeholder="例: yamada@example.com / 090-1234-5678"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-stone-900"
              />
              <p className="text-[11px] text-stone-400 mt-1">確認のご連絡を差し上げる場合がございます。</p>
            </div>

            <div>
              <label htmlFor="details" className="block text-xs font-bold text-stone-700 mb-1">
                修正・更新したい内容 <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="details"
                required
                rows={4}
                placeholder="修正したい箇所や変更後の情報、追加したいSNSアカウントやリンクなどを具体的にご記入ください。&#10;（例: InstagramのアカウントIDを @xxx に変更したい、紹介文の末尾に「オンラインショップ開設」と追記したい、など）"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-stone-900"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="py-2 px-4 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2 px-5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:bg-stone-400 shadow flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>送信中...</span>
                  </>
                ) : (
                  <span>依頼を送信する</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
