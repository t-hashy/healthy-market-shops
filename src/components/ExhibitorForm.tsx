'use client';

import { useState, useEffect, FormEvent } from 'react';
import { doc, addDoc, updateDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../utils/firebase';
import { Exhibitor, CATEGORIES } from '../types';
import Image from 'next/image';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  exhibitorToEdit: Exhibitor | null;
};

// Generate a random string for unique file names
const generateRandomString = () => Math.random().toString(36).substring(2, 15);

export default function ExhibitorForm({ isOpen, onClose, exhibitorToEdit }: Props) {
  const [formData, setFormData] = useState<Partial<Exhibitor>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Effect to populate form when exhibitorToEdit changes
  useEffect(() => {
    if (exhibitorToEdit) {
      setFormData(exhibitorToEdit);
      if (exhibitorToEdit.imageUrl) {
        setImagePreview(exhibitorToEdit.imageUrl);
      }
    } else {
      setFormData({}); // Reset for new entry
    }
  }, [exhibitorToEdit, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError('出店者名は必須です。');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    let finalImageUrl = formData.imageUrl || '';

    try {
      // 1. Handle Image Upload
      if (imageFile) {
        // If it's an edit and there was an old image, delete it
        if (exhibitorToEdit?.imageUrl) {
          try {
            const oldImageRef = ref(storage, exhibitorToEdit.imageUrl);
            await deleteObject(oldImageRef);
          } catch (deleteErr: any) {
             // Non-fatal, log it. The old image might not exist.
            console.warn("Could not delete old image:", deleteErr);
          }
        }

        const imageRef = ref(storage, `exhibitors/${Date.now()}_${generateRandomString()}_${imageFile.name}`);
        const snapshot = await uploadBytes(imageRef, imageFile);
        finalImageUrl = await getDownloadURL(snapshot.ref);
      }

      const dataToSave = {
        ...formData,
        imageUrl: finalImageUrl,
      };

      // 2. Save data to Firestore
      if (exhibitorToEdit) {
        // Update existing document
        const docRef = doc(db, 'exhibitors', exhibitorToEdit.id);
        await updateDoc(docRef, dataToSave);
      } else {
        // Add new document
        await addDoc(collection(db, 'exhibitors'), dataToSave);
      }
      
      closeAndReset();

    } catch (err: any) {
      console.error(err);
      setError(`保存中にエラーが発生しました: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const closeAndReset = () => {
    setFormData({});
    setImageFile(null);
    setImagePreview(null);
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-full overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{exhibitorToEdit ? '出店者情報の編集' : '新規出店者の追加'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">出店名 *</label>
              <input type="text" id="name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">カテゴリ</label>
              <select id="category" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value as any})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                <option value="">選択してください</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">紹介文</label>
              <textarea id="description" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
            </div>
             <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700">ウェブサイトURL</label>
              <input type="url" id="website" value={formData.website || ''} onChange={e => setFormData({...formData, website: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">画像</label>
              <div className="mt-2 flex items-center">
                {imagePreview && <Image src={imagePreview} alt="Preview" width={80} height={80} className="w-20 h-20 object-cover rounded-md mr-4" />}
                <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm" />
              </div>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          <div className="mt-6 flex justify-end gap-4">
            <button type="button" onClick={closeAndReset} disabled={isSubmitting} className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              キャンセル
            </button>
            <button type="submit" disabled={isSubmitting} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400">
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
