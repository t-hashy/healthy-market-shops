'use client';

import { ReactNode } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../utils/firebase';

const ADMIN_EMAIL = 'healthymarket2013@gmail.com';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      alert('Googleログイン中にエラーが発生しました。');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
      alert('ログアウト中にエラーが発生しました。');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-[#FAF8F5]">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl border border-[#EBE7DF] shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#2D5A43] flex items-center justify-center mx-auto mb-4 text-2xl border border-emerald-200/60">
            🌱
          </div>
          <h1 className="text-xl font-bold text-[#2D2A26] mb-1.5">管理者ログイン</h1>
          <p className="text-xs text-[#68635B] mb-6">
            ヘルシーマーケットの管理画面にアクセスするには、管理者アカウントでログインしてください。
          </p>
          <button
            onClick={signInWithGoogle}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-[#2D5A43] hover:bg-[#244A36] transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Googleアカウントでログイン</span>
          </button>
        </div>
      </div>
    );
  }

  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-[#FAF8F5]">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-rose-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 text-2xl">
            🔒
          </div>
          <h1 className="text-xl font-bold text-[#2D2A26] mb-2">アクセス権がありません</h1>
          <p className="text-xs text-[#68635B] mb-6">
            ログイン中のアカウント（<strong className="text-stone-900">{user.email}</strong>）には管理者権限が割り当てられていません。
          </p>
          <button 
            onClick={handleSignOut}
            className="py-2 px-5 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
          >
            別のアカウントでログイン（ログアウト）
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-3 right-4 z-40 flex items-center gap-2.5 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-200 shadow-xs text-xs">
        <span className="text-stone-600">
          <strong className="text-stone-900">{user.displayName}</strong> さん
        </span>
        <button 
          onClick={handleSignOut}
          className="text-[11px] font-semibold text-stone-500 hover:text-rose-600 hover:bg-stone-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
        >
          ログアウト
        </button>
      </div>
      {children}
    </>
  );
}
