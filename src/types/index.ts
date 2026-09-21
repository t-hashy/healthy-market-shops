export type SocialLink = {
  title: string;
  url: string;
};

export type Exhibitor = {
  id: string; // Firestore document ID
  name: string;
  category?: Category; // 互換性（単一）
  categories?: Category[]; // 複数カテゴリ
  marketDays?: string;
  description?: string; // Unified from shortDesc/longDesc
  imageUrl?: string; // 互換性（メイン画像）
  imageUrls?: string[]; // 複数画像（最大5枚）
  address?: string; // Re-adding
  website?: string; // 互換性
  facebookUrl?: string; // 互換性
  instagramUrl?: string; // 互換性
  twitterUrl?: string; // 互換性
  links?: SocialLink[]; // タイトル＋URLの複数リンク
  isHidden?: boolean; // 非表示フラグ
  eventIds?: string[]; // 参加した開催回（MarketEvent）のID配列
};

export type MarketEvent = {
  id: string; // Firestore document ID
  name: string; // 例: "第12回 ヘルシーマーケット（2026秋）"
  date: string; // 例: "2026年10月18日(日) 10:00〜16:00"
  location: string; // 例: "世田谷公園 けやき広場"
  isUpcoming?: boolean; // 次回開催フラグ
  order?: number; // ソート用（大きいほど新しい等）
  flyerUrl?: string; // チラシJPG画像のURL
  flyerImageUrl?: string; // 互換性用
  createdAt?: string;
};

export type EditRequest = {
  id: string;
  exhibitorId: string;
  exhibitorName: string;
  requesterName: string;
  contact: string; // メールアドレスまたは電話番号
  details: string; // 修正依頼内容
  status: 'pending' | 'resolved'; // 未対応 / 対応済み
  createdAt: string; // ISO 8601 文字列
};

export const CATEGORIES = ["農家", "飲食", "カフェ", "クラフト"] as const;
export type Category = (typeof CATEGORIES)[number];

export const FILTER_CATEGORIES = ["ALL", ...CATEGORIES] as const;
export type FilterCategory = (typeof FILTER_CATEGORIES)[number];

export const CATEGORY_ICONS: Record<FilterCategory, string> = {
  ALL: "🌾",
  農家: "🥬",
  飲食: "🍲",
  カフェ: "☕",
  クラフト: "🧵",
};

// カテゴリごとのスタンプ風アースカラースタイル
export const CATEGORY_STYLES: {
  [key in Category]: {
    base: string;
    bg: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    border: string;
  };
} = {
  農家: {
    base: "emerald",
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    badgeBg: "bg-[#E2EFE0]",
    badgeText: "text-[#2D532B]",
    border: "border-[#4A6B5D]",
  },
  飲食: {
    base: "amber",
    bg: "bg-amber-50",
    text: "text-amber-950",
    badgeBg: "bg-[#F9E9D7]",
    badgeText: "text-[#8C4A28]",
    border: "border-[#C86D51]",
  },
  カフェ: {
    base: "stone",
    bg: "bg-stone-100",
    text: "text-stone-800",
    badgeBg: "bg-[#EFE8E1]",
    badgeText: "text-[#59483E]",
    border: "border-[#7C6A5D]",
  },
  クラフト: {
    base: "teal",
    bg: "bg-teal-50",
    text: "text-teal-950",
    badgeBg: "bg-[#E0F2F1]",
    badgeText: "text-[#1E5D5B]",
    border: "border-[#3A8B88]",
  },
};

/**
 * 開催回を名前の昇順（自然順ソート: 第1回 -> 第2回 -> 第10回）でソートする
 */
export function sortEventsAscending(events: MarketEvent[]): MarketEvent[] {
  return [...events].sort((a, b) => {
    const nameA = (a.name || '').replace(/[０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    const nameB = (b.name || '').replace(/[０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    return nameA.localeCompare(nameB, 'ja', { numeric: true });
  });
}

// ヘルパー関数: カテゴリ配列を取得
export function getExhibitorCategories(exhibitor: Exhibitor): Category[] {
  if (Array.isArray(exhibitor.categories) && exhibitor.categories.length > 0) {
    return exhibitor.categories;
  }
  if (exhibitor.category) {
    return [exhibitor.category];
  }
  return [];
}

// ヘルパー関数: 画像配列を取得
export function getExhibitorImages(exhibitor: Exhibitor): string[] {
  if (Array.isArray(exhibitor.imageUrls) && exhibitor.imageUrls.length > 0) {
    return exhibitor.imageUrls.filter(Boolean);
  }
  if (exhibitor.imageUrl) {
    return [exhibitor.imageUrl];
  }
  return [];
}

// ヘルパー関数: リンク配列を取得
export function getExhibitorLinks(exhibitor: Exhibitor): SocialLink[] {
  if (Array.isArray(exhibitor.links) && exhibitor.links.length > 0) {
    return exhibitor.links.filter((link) => link.url && link.title);
  }
  const fallbackLinks: SocialLink[] = [];
  if (exhibitor.website) fallbackLinks.push({ title: "ウェブサイト", url: exhibitor.website });
  if (exhibitor.instagramUrl) fallbackLinks.push({ title: "インスタグラム", url: exhibitor.instagramUrl });
  if (exhibitor.facebookUrl) fallbackLinks.push({ title: "フェイスブック", url: exhibitor.facebookUrl });
  if (exhibitor.twitterUrl) fallbackLinks.push({ title: "X (旧Twitter)", url: exhibitor.twitterUrl });
  return fallbackLinks;
}

// ヘルパー関数: 出店者の参加イベント配列を取得
export function getExhibitorEvents(exhibitor: Exhibitor, events: MarketEvent[]): MarketEvent[] {
  if (!Array.isArray(exhibitor.eventIds) || exhibitor.eventIds.length === 0) {
    return [];
  }
  return events.filter((ev) => exhibitor.eventIds?.includes(ev.id));
}
