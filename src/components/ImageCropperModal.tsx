'use client';

import { useState, useRef, useEffect, useCallback, MouseEvent, TouchEvent } from 'react';

type Props = {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedFile: File, croppedPreviewUrl: string) => void;
  title?: string;
};

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  title = 'サムネイルの切り取り位置を調整',
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const touchStartDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);
  const [safeImageSrc, setSafeImageSrc] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(true);
  const [hasLoadError, setHasLoadError] = useState<boolean>(false);

  // 枠の表示サイズ（出店者カードの横長アスペクト比 2:1 に完全一致）
  const CROP_BOX_WIDTH = 320;
  const CROP_BOX_HEIGHT = 160;

  // 初期化 & 画像ソースの安全なロード
  useEffect(() => {
    if (!isOpen || !imageSrc) {
      setSafeImageSrc(null);
      setIsLoadingImage(false);
      setHasLoadError(false);
      return;
    }

    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setHasLoadError(false);
    setIsLoadingImage(true);
    setImageNaturalSize({ width: 0, height: 0 });

    if (imageSrc.startsWith('blob:') || imageSrc.startsWith('data:')) {
      // ローカルBlobまたはData URLは同一オリジンなのでそのまま使用
      setSafeImageSrc(imageSrc);
    } else {
      // リモート画像（Firebase Storage等）の場合、ブラウザの古い非CORSキャッシュを回避するため
      // キャッシュバスターパラメータを付与してCORSヘッダーを確実に取得
      const separator = imageSrc.includes('?') ? '&' : '?';
      setSafeImageSrc(`${imageSrc}${separator}_cors_cb=${Date.now()}`);
    }
  }, [isOpen, imageSrc]);

  // 画像読み込み完了時のサイズ取得
  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setImageNaturalSize({ width: naturalWidth, height: naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setIsLoadingImage(false);
      setHasLoadError(false);
    }
  };

  // 画像読み込みエラー時のハンドラ
  const handleImageError = () => {
    console.error('Failed to load image in cropper:', safeImageSrc);
    setIsLoadingImage(false);
    setHasLoadError(true);
  };

  // マウス操作（ドラッグ移動）
  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!isDragging) return;
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // タッチ操作（ドラッグ移動 & ピンチズーム）
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
    } else if (e.touches.length === 2) {
      // ピンチズーム開始
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      initialZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setOffset({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleChange = dist / touchStartDistRef.current;
      const newZoom = Math.min(Math.max(initialZoomRef.current * scaleChange, 1), 3);
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartDistRef.current = null;
  };

  // マウスホイールによるズーム
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(prev + delta, 1), 3));
  };

  // 中央にリセット
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // クロップ実行
  const handleCrop = async () => {
    if (!imageRef.current || !imageNaturalSize.width || !imageNaturalSize.height) return;
    setIsProcessing(true);

    try {
      const img = imageRef.current;
      const canvas = document.createElement('canvas');
      const OUTPUT_WIDTH = 800; // カード写真枠比率 2:1 (800x400 高解像度)
      const OUTPUT_HEIGHT = 400;
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context could not be created');

      // CROP_BOX (320x160px) 内での画像描画サイズと位置
      const scaleToFit = Math.max(
        CROP_BOX_WIDTH / imageNaturalSize.width,
        CROP_BOX_HEIGHT / imageNaturalSize.height
      );

      const renderedWidth = imageNaturalSize.width * scaleToFit * zoom;
      const renderedHeight = imageNaturalSize.height * scaleToFit * zoom;

      // 切り取り枠の中央を基準にした画像中心の位置
      const imageCenterX = CROP_BOX_WIDTH / 2 + offset.x;
      const imageCenterY = CROP_BOX_HEIGHT / 2 + offset.y;

      const imageLeft = imageCenterX - renderedWidth / 2;
      const imageTop = imageCenterY - renderedHeight / 2;

      // 切り取り枠が画像のどの部分に対応するか計算
      const cropLeftInRendered = -imageLeft;
      const cropTopInRendered = -imageTop;

      // 元画像 (naturalSize) での切り取り矩形
      const renderToNaturalScale = imageNaturalSize.width / renderedWidth;
      const sourceX = cropLeftInRendered * renderToNaturalScale;
      const sourceY = cropTopInRendered * renderToNaturalScale;
      const sourceWidth = CROP_BOX_WIDTH * renderToNaturalScale;
      const sourceHeight = CROP_BOX_HEIGHT * renderToNaturalScale;

      // Canvasに描画
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        OUTPUT_WIDTH,
        OUTPUT_HEIGHT
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsProcessing(false);
            return;
          }
          const croppedFile = new File([blob], `thumb_${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          const croppedPreviewUrl = URL.createObjectURL(blob);
          onCropComplete(croppedFile, croppedPreviewUrl);
          setIsProcessing(false);
          onClose();
        },
        'image/jpeg',
        0.92
      );
    } catch (err) {
      console.error('Error cropping image:', err);
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  // 短辺フィットのスケール計算
  const scaleToFit =
    imageNaturalSize.width && imageNaturalSize.height
      ? Math.max(
          CROP_BOX_WIDTH / imageNaturalSize.width,
          CROP_BOX_HEIGHT / imageNaturalSize.height
        )
      : 1;

  const displayWidth = imageNaturalSize.width * scaleToFit * zoom;
  const displayHeight = imageNaturalSize.height * scaleToFit * zoom;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-[#FAF6F0] rounded-2xl border-2 border-[#2D2622] shadow-[6px_6px_0px_0px_rgba(45,38,34,1)] overflow-hidden flex flex-col max-h-[95vh]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#FDFBF7] border-b-2 border-[#2D2622]">
          <div className="flex items-center gap-2">
            <span className="text-lg">✂️</span>
            <div>
              <h3 className="font-title font-black text-sm sm:text-base text-[#2D2622]">
                {title}
              </h3>
              <p className="text-[10px] text-stone-500 font-bold">
                ※カード一覧用の横長サムネイルを切り取ります。詳細を開いた時は元の全体写真が表示されます。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white text-[#2D2622] border border-[#2D2622] font-black text-xs flex items-center justify-center hover:bg-rose-100 cursor-pointer shadow-xs"
          >
            ✕
          </button>
        </div>

        {/* ガイドテキスト */}
        <div className="px-4 py-2 bg-amber-50/80 border-b border-amber-200/80 text-[11px] sm:text-xs text-[#59483E] flex items-center justify-between">
          <span>👆 ドラッグして位置移動、スライダーで拡大縮小</span>
          <button
            type="button"
            onClick={handleReset}
            className="text-[10px] font-bold text-emerald-800 hover:underline cursor-pointer flex-shrink-0"
          >
            位置をリセット
          </button>
        </div>

        {/* クロップ操作キャンバスエリア */}
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-stone-900 overflow-hidden">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{ width: `${CROP_BOX_WIDTH}px`, height: `${CROP_BOX_HEIGHT}px` }}
            className="relative overflow-hidden cursor-grab active:cursor-grabbing border-2 border-amber-300 rounded-md shadow-2xl bg-black select-none touch-none"
          >
            {/* 切り取り対象の画像本体 */}
            {safeImageSrc && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                ref={imageRef}
                src={safeImageSrc}
                crossOrigin="anonymous"
                alt="クロップ対象"
                onLoad={handleImageLoad}
                onError={handleImageError}
                draggable={false}
                style={{
                  width: `${displayWidth}px`,
                  height: `${displayHeight}px`,
                  transform: `translate(${offset.x + CROP_BOX_WIDTH / 2 - displayWidth / 2}px, ${
                    offset.y + CROP_BOX_HEIGHT / 2 - displayHeight / 2
                  }px)`,
                  maxWidth: 'none',
                  display: isLoadingImage || hasLoadError ? 'none' : 'block',
                }}
                className="absolute top-0 left-0 pointer-events-none transition-none"
              />
            )}

            {/* ローディングスピナー */}
            {isLoadingImage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-300 text-xs font-bold gap-2 bg-stone-900/90 z-10">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>画像読み込み中...</span>
              </div>
            )}

            {/* ロードエラー時の表示 */}
            {hasLoadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-rose-300 text-xs font-bold gap-2 p-4 text-center bg-stone-900/95 z-10">
                <span>画像の読み込みに失敗しました</span>
                <button
                  type="button"
                  onClick={() => {
                    setHasLoadError(false);
                    setIsLoadingImage(true);
                    const separator = (imageSrc || '').includes('?') ? '&' : '?';
                    setSafeImageSrc(`${imageSrc}${separator}_cors_retry=${Date.now()}`);
                  }}
                  className="px-3 py-1 bg-stone-700 hover:bg-stone-600 text-white rounded text-[11px] cursor-pointer"
                >
                  再読み込み
                </button>
              </div>
            )}

            {/* ガイドグリッド（三分割線 & 枠線） */}
            <div className="absolute inset-0 pointer-events-none border border-white/60">
              <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/30"></div>
                <div className="border-r border-b border-white/30"></div>
                <div className="border-b border-white/30"></div>
                <div className="border-r border-b border-white/30"></div>
                <div className="border-r border-b border-white/30"></div>
                <div className="border-b border-white/30"></div>
                <div className="border-r border-white/30"></div>
                <div className="border-r border-white/30"></div>
                <div></div>
              </div>
            </div>

            {/* 横長バッジ */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-amber-300 text-[10px] font-black backdrop-blur-xs pointer-events-none border border-amber-300/30">
              カード表示枠 (横長 2:1)
            </div>
          </div>
        </div>

        {/* コントロールエリア（ズームスライダー & 確定ボタン） */}
        <div className="p-4 bg-[#FAF6F0] space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#59483E] flex items-center gap-1 flex-shrink-0">
              <span>🔍 ズーム:</span>
              <span className="font-mono">{Math.round(zoom * 100)}%</span>
            </span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.02"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[#C86D51] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-[#2D2622] border-2 border-[#2D2622] hover:bg-stone-100 shadow-signboard cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleCrop}
              disabled={isProcessing}
              className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#C86D51] hover:bg-[#B35C41] border-2 border-[#2D2622] shadow-signboard hover:shadow-signboard-lg cursor-pointer flex items-center gap-1.5 transition-all"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>切り取り中...</span>
                </>
              ) : (
                <>
                  <span>✂️</span>
                  <span>この範囲で決定</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
