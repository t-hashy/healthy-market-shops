'use client';

import { useState, useEffect, useMemo, useRef, FormEvent, ChangeEvent } from 'react';
import { doc, addDoc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../utils/firebase';
import {
  Exhibitor,
  MarketEvent,
  CATEGORIES,
  Category,
  CATEGORY_STYLES,
  SocialLink,
  getExhibitorCategories,
  getExhibitorImages,
  getExhibitorLinks,
  sortEventsAscending,
} from '../types';
import Image from 'next/image';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  exhibitorToEdit: Exhibitor | null;
  existingExhibitors?: Exhibitor[];
};

type NewImageItem = {
  id: string;
  file: File;
  previewUrl: string;
};

const MAX_IMAGES = 5;

const DEFAULT_LINK_TITLES = [
  'インスタグラム',
  'フェイスブック',
  'X (旧Twitter)',
  'ウェブサイト',
  'オンラインショップ',
  'LINE公式',
  'YouTube',
  'note',
  'TikTok',
];

const generateRandomString = () => Math.random().toString(36).substring(2, 12);

export default function ExhibitorForm({ isOpen, onClose, exhibitorToEdit, existingExhibitors = [] }: Props) {
  const [formData, setFormData] = useState<Partial<Exhibitor>>({});
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<NewImageItem[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<'close' | 'continue' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [availableEvents, setAvailableEvents] = useState<MarketEvent[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // 開催回データの取得（名前昇順でソート）
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, 'marketEvents'));
        const snap = await getDocs(q);
        const list: MarketEvent[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as MarketEvent));
        setAvailableEvents(sortEventsAscending(list));
      } catch (err) {
        console.warn('Error fetching marketEvents for form:', err);
      }
    };
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen]);

  // 過去に入力されたことのあるタイトル候補を収集（重複排除・表記ゆれ防止用）
  const titleSuggestions = useMemo(() => {
    const titleSet = new Set<string>(DEFAULT_LINK_TITLES);
    for (const exhibitor of existingExhibitors) {
      const exLinks = getExhibitorLinks(exhibitor);
      for (const l of exLinks) {
        if (l.title && l.title.trim()) {
          titleSet.add(l.title.trim());
        }
      }
    }
    return Array.from(titleSet);
  }, [existingExhibitors]);

  // モーダルオープン時または編集対象変更時の初期化
  useEffect(() => {
    if (exhibitorToEdit) {
      setFormData(exhibitorToEdit);
      setSelectedCategories(getExhibitorCategories(exhibitorToEdit));
      const loadedLinks = getExhibitorLinks(exhibitorToEdit);
      setLinks(loadedLinks.length > 0 ? loadedLinks : [{ title: '', url: '' }]);
      setExistingImages(getExhibitorImages(exhibitorToEdit));
      setSelectedEventIds(exhibitorToEdit.eventIds || []);
    } else {
      setFormData({});
      setSelectedCategories([]);
      setLinks([{ title: 'インスタグラム', url: '' }]);
      setExistingImages([]);
      // 新規の場合は次回開催があればデフォルト選択
      const upcoming = availableEvents.find((e) => e.isUpcoming);
      setSelectedEventIds(upcoming ? [upcoming.id] : []);
    }
    setNewImageFiles([]);
    setRemovedImageUrls([]);
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
    setSubmittingAction(null);
  }, [exhibitorToEdit, isOpen, availableEvents]);

  // 出店回選択トグル
  const handleToggleEvent = (eventId: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  // カテゴリ選択トグル
  const handleToggleCategory = (cat: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // 画像選択処理（最大5枚まで）
  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const currentTotal = existingImages.length + newImageFiles.length;
    const availableSlots = MAX_IMAGES - currentTotal;

    if (availableSlots <= 0) {
      setError(`画像は最大${MAX_IMAGES}枚までしか登録できません。`);
      e.target.value = '';
      return;
    }

    const files = Array.from(e.target.files);
    if (files.length > availableSlots) {
      setError(`画像は最大${MAX_IMAGES}枚までです。残りの空き（${availableSlots}枚）のみ追加しました。`);
    } else {
      setError(null);
    }

    const allowedFiles = files.slice(0, availableSlots);
    const newItems: NewImageItem[] = allowedFiles.map((file) => ({
      id: `${Date.now()}_${generateRandomString()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setNewImageFiles((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  // 既存画像の削除
  const handleRemoveExistingImage = (index: number) => {
    const urlToRemove = existingImages[index];
    setRemovedImageUrls((prev) => [...prev, urlToRemove]);
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 新規追加プレビュー画像の削除
  const handleRemoveNewFile = (id: string) => {
    setNewImageFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  // 既存画像をメイン（先頭）に設定
  const handleSetExistingAsMain = (index: number) => {
    setExistingImages((prev) => {
      const item = prev[index];
      const next = prev.filter((_, i) => i !== index);
      return [item, ...next];
    });
  };

  // リンクの追加
  const handleAddLink = (presetTitle = '') => {
    setLinks((prev) => [...prev, { title: presetTitle, url: '' }]);
  };

  // リンクの更新
  const handleUpdateLink = (index: number, field: 'title' | 'url', value: string) => {
    setLinks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // リンクの削除
  const handleRemoveLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // フォーム送信処理（continueAdding: true の場合はフォームをリセットして続けて登録可能にする）
  const handleSave = async (continueAdding: boolean = false) => {
    if (!formData.name?.trim()) {
      setError('出店者名は必須です。');
      return;
    }

    setIsSubmitting(true);
    setSubmittingAction(continueAdding ? 'continue' : 'close');
    setError(null);
    setSuccessMessage(null);

    try {
      const savedName = formData.name.trim();

      // 1. 新規画像ファイルをFirebase Storageにアップロード
      const newlyUploadedUrls: string[] = [];
      for (const item of newImageFiles) {
        const imagePath = `exhibitors/${Date.now()}_${generateRandomString()}_${item.file.name}`;
        const imageRef = ref(storage, imagePath);
        const snapshot = await uploadBytes(imageRef, item.file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        newlyUploadedUrls.push(downloadUrl);
      }

      // 全画像URL（既存 + 新規アップロード）
      const finalImageUrls = [...existingImages, ...newlyUploadedUrls].slice(0, MAX_IMAGES);

      // 削除された既存画像をStorageから安全に削除（失敗しても処理は続行）
      for (const oldUrl of removedImageUrls) {
        try {
          const oldImageRef = ref(storage, oldUrl);
          await deleteObject(oldImageRef);
        } catch (delErr) {
          console.warn('Storageからの画像削除をスキップしました:', delErr);
        }
      }

      // 2. 有効なリンクのみ抽出
      const cleanLinks = links
        .map((l) => ({ title: l.title.trim(), url: l.url.trim() }))
        .filter((l) => l.title !== '' && l.url !== '');

      // 3. Firestore保存用データ構築
      const dataToSave: Record<string, unknown> = {
        name: savedName,
        categories: selectedCategories,
        category: selectedCategories[0] || null, // 互換性用
        description: formData.description?.trim() || '',
        marketDays: formData.marketDays?.trim() || '',
        address: formData.address?.trim() || '',
        imageUrls: finalImageUrls,
        imageUrl: finalImageUrls[0] || '', // 互換性用メイン画像
        links: cleanLinks,
        website: cleanLinks.find((l) => l.title.includes('ウェブ') || l.title.includes('HP'))?.url || '',
        isHidden: !!formData.isHidden,
        eventIds: selectedEventIds,
      };

      if (exhibitorToEdit) {
        const docRef = doc(db, 'exhibitors', exhibitorToEdit.id);
        await updateDoc(docRef, dataToSave);
      } else {
        await addDoc(collection(db, 'exhibitors'), dataToSave);
      }

      if (continueAdding) {
        // プレビュー用URLの解放
        newImageFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        setFormData({});
        setSelectedCategories([]);
        setLinks([{ title: 'インスタグラム', url: '' }]);
        setExistingImages([]);
        setNewImageFiles([]);
        setRemovedImageUrls([]);
        // 次回開催回があれば次回のみチェック維持
        const upcoming = availableEvents.find((e) => e.isUpcoming);
        setSelectedEventIds(upcoming ? [upcoming.id] : []);
        setSuccessMessage(`「${savedName}」を登録しました。続けて次の出店者を入力できます。`);
        // モーダルのスクロールを上部に戻す
        if (modalContainerRef.current) {
          modalContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        closeAndReset();
      }
    } catch (err: unknown) {
      console.error('保存中にエラーが発生しました:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`保存中にエラーが発生しました: ${message}`);
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  const closeAndReset = () => {
    // プレビュー用URLの解放
    newImageFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setFormData({});
    setSelectedCategories([]);
    setLinks([]);
    setExistingImages([]);
    setNewImageFiles([]);
    setRemovedImageUrls([]);
    setSelectedEventIds([]);
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
    setSubmittingAction(null);
    onClose();
  };

  if (!isOpen) return null;

  const totalImagesCount = existingImages.length + newImageFiles.length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-4">
      <div ref={modalContainerRef} className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-stone-100">
          <h2 className="text-2xl font-bold text-stone-900">
            {exhibitorToEdit ? '出店者情報の編集' : '新規出店者の追加'}
          </h2>
          <button
            type="button"
            onClick={closeAndReset}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-sm font-medium flex items-center gap-2.5">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(false); }} className="space-y-6">
          {/* 出店名 */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-stone-800 mb-1">
              出店名 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              placeholder="例: オーガニックファーム山田"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-stone-900"
            />
          </div>

          {/* カテゴリ（複数選択） */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-stone-800">
                カテゴリ <span className="text-xs font-normal text-stone-500">（複数選択できます）</span>
              </label>
              {selectedCategories.length > 0 && (
                <span className="text-xs font-medium text-emerald-700">
                  {selectedCategories.length}個選択中
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                const style = CATEGORY_STYLES[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleToggleCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? `${style.badgeBg} ${style.badgeText} ${style.border} shadow-xs scale-102`
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span>{isSelected ? '✓' : '＋'}</span>
                    <span>#{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 紹介文 */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-stone-800 mb-1">
              紹介文
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="お店のこだわりや商品の特徴などを入力してください。"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-stone-900"
            />
          </div>

          {/* 出店回（参加イベント） */}
          {availableEvents.length > 0 && (
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="block text-sm font-semibold text-stone-800">
                    出店する開催回 <span className="text-xs font-normal text-stone-500">（複数選択可）</span>
                  </label>
                  <p className="text-xs text-stone-500">
                    チェックを入れた開催回の出店者一覧に表示されます。
                  </p>
                </div>
                {selectedEventIds.length > 0 && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {selectedEventIds.length}回 参加
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                {availableEvents.map((ev) => {
                  const isChecked = selectedEventIds.includes(ev.id);
                  return (
                    <label
                      key={ev.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleEvent(ev.id)}
                        className="w-4 h-4 mt-0.5 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                          <span>{ev.name}</span>
                          {ev.isUpcoming && (
                            <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                              ★次回
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{ev.date}</div>
                        <div className="text-[10px] text-stone-400 truncate">{ev.location}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* 画像（複数登録・最大5枚） */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-semibold text-stone-800">
                  出店画像 <span className="text-xs font-normal text-stone-500">（最大5枚まで）</span>
                </label>
                <p className="text-xs text-stone-500 mt-0.5">
                  1枚目が一覧カードのメイン（表紙）画像になります。
                </p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                totalImagesCount >= MAX_IMAGES ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-700'
              }`}>
                {totalImagesCount} / {MAX_IMAGES}枚
              </span>
            </div>

            {/* 画像プレビュー一覧 */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
              {/* 既存画像 */}
              {existingImages.map((url, idx) => (
                <div key={url} className="relative group aspect-square rounded-xl overflow-hidden border border-stone-300 bg-stone-200">
                  <Image src={url} alt="" fill className="object-cover" />
                  {idx === 0 && (
                    <div className="absolute top-1 left-1 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                      メイン
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetExistingAsMain(idx)}
                        className="text-[10px] bg-white text-stone-900 px-1.5 py-0.5 rounded shadow hover:bg-stone-100"
                      >
                        メイン化
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImage(idx)}
                      className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded shadow hover:bg-rose-700"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}

              {/* 新規追加プレビュー */}
              {newImageFiles.map((item, idx) => {
                const isOverallFirst = existingImages.length === 0 && idx === 0;
                return (
                  <div key={item.id} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-emerald-400 bg-stone-200">
                    <Image src={item.previewUrl} alt="" fill className="object-cover" />
                    {isOverallFirst && (
                      <div className="absolute top-1 left-1 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                        メイン
                      </div>
                    )}
                    <div className="absolute top-1 right-1 bg-emerald-500 text-white text-[9px] font-bold px-1 rounded">
                      NEW
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                      <button
                        type="button"
                        onClick={() => handleRemoveNewFile(item.id)}
                        className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded shadow hover:bg-rose-700"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* 画像追加ボタン（上限5枚未満の場合のみ表示） */}
              {totalImagesCount < MAX_IMAGES && (
                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-stone-400 hover:text-emerald-700">
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[11px] font-medium">画像追加</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* ウェブサイト・SNSリンク（複数登録・サジェスト付き） */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-sm font-semibold text-stone-800">
                  ウェブサイト・SNSリンク <span className="text-xs font-normal text-stone-500">（複数追加可能）</span>
                </label>
                <p className="text-xs text-stone-500">
                  タイトルには過去の入力データが入力に応じてサジェスト表示されます。
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAddLink()}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <span>＋</span> リンク追加
              </button>
            </div>

            {/* 定番タイトルのクイック追加ボタン */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-xs text-stone-500 mr-1">ワンクリック追加:</span>
              {['インスタグラム', 'フェイスブック', 'X (旧Twitter)', 'ウェブサイト', 'オンラインショップ'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddLink(preset)}
                  className="text-xs bg-white text-stone-700 border border-stone-300 hover:border-emerald-500 hover:text-emerald-700 px-2 py-0.5 rounded-md transition-colors"
                >
                  ＋ {preset}
                </button>
              ))}
            </div>

            {/* サジェスト用 datalist */}
            <datalist id="link-title-suggestions">
              {titleSuggestions.map((title) => (
                <option key={title} value={title} />
              ))}
            </datalist>

            {/* リンク入力行リスト */}
            <div className="space-y-2.5">
              {links.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-stone-200 shadow-xs">
                  <div className="w-1/3 min-w-[120px]">
                    <input
                      type="text"
                      list="link-title-suggestions"
                      placeholder="タイトル (例: インスタグラム)"
                      value={link.title}
                      onChange={(e) => handleUpdateLink(idx, 'title', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-stone-900"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={link.url}
                      onChange={(e) => handleUpdateLink(idx, 'url', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-stone-900"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(idx)}
                    className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                    title="このリンクを削除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              {links.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-2">
                  リンクは登録されていません。「＋ リンク追加」またはクイック追加ボタンから登録できます。
                </p>
              )}
            </div>
          </div>

          {/* 公開・非表示設定 */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
            <div>
              <label htmlFor="isHidden" className="text-sm font-semibold text-stone-800 block cursor-pointer">
                非表示設定
              </label>
              <p className="text-xs text-stone-500 mt-0.5">
                ONにすると、トップページの出店者一覧から非表示になります。
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="isHidden"
                checked={!!formData.isHidden}
                onChange={(e) => setFormData({ ...formData, isHidden: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              <span className="ml-2.5 text-xs font-semibold text-stone-700">
                {formData.isHidden ? '非表示' : '公開'}
              </span>
            </label>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
              {error}
            </div>
          )}

          {/* ボタン群 */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={closeAndReset}
              disabled={isSubmitting}
              className="py-2.5 px-5 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 bg-white hover:bg-stone-50 transition-colors disabled:opacity-50 text-center"
            >
              キャンセル
            </button>
            {!exhibitorToEdit && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSubmitting}
                className="py-2.5 px-5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
              >
                {isSubmitting && submittingAction === 'continue' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-emerald-700" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>登録中...</span>
                  </>
                ) : (
                  <span>保存して続けて入力</span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="py-2.5 px-6 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:bg-stone-400 shadow flex items-center justify-center gap-2"
            >
              {isSubmitting && submittingAction === 'close' ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>保存中...</span>
                </>
              ) : (
                <span>保存して終了</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
