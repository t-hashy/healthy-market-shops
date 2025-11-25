export type Exhibitor = {
  id: string;
  name: string;
  category: Category;
  shortDesc: string;
  longDesc: string;
  imageUrl: string;
  address?: string; // New: Address of the exhibitor
  websiteUrl?: string; // New: Official website URL
  facebookUrl?: string; // New: Facebook page URL
  instagramUrl?: string; // New: Instagram profile URL
  twitterUrl?: string; // New: Twitter profile URL
};

export const CATEGORIES = ["農家", "飲食", "カフェ", "クラフト"] as const;
export type Category = (typeof CATEGORIES)[number];

export const FILTER_CATEGORIES = ["ALL", ...CATEGORIES] as const;
export type FilterCategory = (typeof FILTER_CATEGORIES)[number];

// カテゴリごとのスタイルを定義
export const CATEGORY_STYLES: {
  [key in Category]: { base: string; bg: string; text: string };
} = {
  農家: {
    base: "green",
    bg: "bg-green-50",
    text: "text-green-800",
  },
  飲食: {
    base: "red",
    bg: "bg-red-50",
    text: "text-red-800",
  },
  カフェ: {
    base: "stone",
    bg: "bg-stone-100",
    text: "text-stone-800",
  },
  クラフト: {
    base: "orange",
    bg: "bg-orange-50",
    text: "text-orange-800",
  },
};
