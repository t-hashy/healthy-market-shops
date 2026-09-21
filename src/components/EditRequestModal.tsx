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
      setError('お名前またはご担当者名をご入力ください。');
      return;
    }
    if (!contact.trim()) {
      setError('ご連絡先（メールアドレスまたは電話番号）をご入力ください。');
      return;
    }
    if (!details.trim()) {
      setError('お問い合わせ・変更内容をご入力ください。');
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
      setError(`送信できませんでした: ${message}`);
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
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-lg bg-[#FDFBF7] border-2 border-[#3A3530] rounded-2xl shadow-[6px_6px_0px_0px_rgba(58,53,48,1)] p-5 sm:p-6 overflow-hidden animate-slide-up-fade"
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-stone-200">
          <div>
            <h3 className="text-lg font-black text-[#2D2622]">掲載内容の変更・お問い合わせ</h3>
            <p className="text-xs font-bold text-[#C86D51] mt-0.5">
              対象: {exhibitor.name} さん
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white text-[#2D2622] border-2 border-[#3A3530] font-black text-sm flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {isSuccess ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 bg-[#E2EFE0] text-[#2D532B] border-2 border-[#4A6B5D] rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">
              ✓
            </div>
            <h4 className="text-base font-black text-[#2D2622] mb-2">メッセージを送信しました</h4>
            <p className="text-xs text-[#59483E] mb-5 leading-relaxed">
              運営事務局にて内容を確認の上、順次対応させていただきます。
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="py-2 px-6 rounded-full text-xs font-extrabold text-white bg-[#4A6B5D] border-2 border-[#3A3530] shadow-[2px_2px_0px_0px_rgba(58,53,48,1)]"
            >
              閉じる
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="requesterName" className="block text-xs font-extrabold text-[#2D2622] mb-1">
                お名前・ご担当者名 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="requesterName"
                required
                placeholder="例: 山田 太郎"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-[#3A3530] rounded-xl text-[#2D2622] font-bold bg-white"
              />
            </div>

            <div>
              <label htmlFor="contact" className="block text-xs font-extrabold text-[#2D2622] mb-1">
                ご連絡先 (メールアドレス または 電話番号) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="contact"
                required
                placeholder="例: yamada@example.com"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-[#3A3530] rounded-xl text-[#2D2622] font-bold bg-white"
              />
            </div>

            <div>
              <label htmlFor="details" className="block text-xs font-extrabold text-[#2D2622] mb-1">
                お問い合わせ・変更したい内容 <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="details"
                required
                rows={4}
                placeholder="修正したい箇所や変更後の情報、追加したいSNSなどをご記入ください。"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-[#3A3530] rounded-xl text-[#2D2622] font-bold bg-white"
              />
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-bold">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="py-2 px-4 rounded-full text-xs font-extrabold text-[#2D2622] bg-white border-2 border-[#3A3530]"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2 px-5 rounded-full text-xs font-extrabold text-white bg-[#C86D51] border-2 border-[#3A3530] shadow-[2px_2px_0px_0px_rgba(58,53,48,1)]"
              >
                {isSubmitting ? "送信中..." : "送信する"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
