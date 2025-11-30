'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../utils/firebase';
import { Exhibitor } from '../types';
import ExhibitorForm from './ExhibitorForm';

export default function ExhibitorManager() {
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [exhibitorToEdit, setExhibitorToEdit] = useState<Exhibitor | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'exhibitors'), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const exhibitorsData: Exhibitor[] = [];
      querySnapshot.forEach((doc) => {
        exhibitorsData.push({ id: doc.id, ...doc.data() } as Exhibitor);
      });
      setExhibitors(exhibitorsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching exhibitors in real-time: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
  };

  const handleDelete = async (id: string, imageUrl?: string) => {
    if (!confirm('この出店者情報を完全に削除します。よろしいですか？')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'exhibitors', id));
      if (imageUrl) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (storageError: any) {
          console.warn(`Could not delete image ${imageUrl}. It might not exist.`, storageError);
        }
      }
      alert('出店者情報を削除しました。');
    } catch (error) {
      console.error('Error deleting exhibitor: ', error);
      alert('削除中にエラーが発生しました。');
    }
  };


  if (loading) {
    return <p>出店者リストを読み込んでいます...</p>;
  }

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">出店者情報管理</h2>
          <button
            onClick={handleAddNew}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
          >
            新規追加
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出店名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">カテゴリ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exhibitors.map((exhibitor) => (
                <tr key={exhibitor.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{exhibitor.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {exhibitor.category && (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800`}>
                        {exhibitor.category}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(exhibitor)} className="text-indigo-600 hover:text-indigo-900">編集</button>
                    <button 
                      onClick={() => handleDelete(exhibitor.id, exhibitor.imageUrl)}
                      className="text-red-600 hover:text-red-900 ml-4"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {exhibitors.length === 0 && !loading && <p className="text-center text-gray-500 mt-4">表示する出店者がいません。</p>}
      </div>
      
      <ExhibitorForm 
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        exhibitorToEdit={exhibitorToEdit}
      />
    </>
  );
}
