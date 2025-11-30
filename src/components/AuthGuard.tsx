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
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">管理者ログイン</h1>
        <p className="mb-6">このページにアクセスするにはログインが必要です。</p>
        <button
          onClick={signInWithGoogle}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Googleでログイン
        </button>
      </div>
    );
  }

  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4 text-red-600">アクセス権がありません</h1>
        <p className="mb-6">あなたのアカウント ({user.email}) には、このページを閲覧する権限がありません。</p>
        <button 
          onClick={handleSignOut}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="absolute top-4 right-4">
        <span className="text-sm mr-4">ようこそ, {user.displayName}さん</span>
        <button 
          onClick={handleSignOut}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          ログアウト
        </button>
      </div>
      {children}
    </>
  );
}
