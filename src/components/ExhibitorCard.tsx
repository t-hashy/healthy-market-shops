"use client";

import Image from "next/image";
import { Exhibitor, CATEGORY_STYLES } from "../types";

type Props = {
  exhibitor: Exhibitor;
  onClick: () => void;
};

export default function ExhibitorCard({ exhibitor, onClick }: Props) {
  // Get the specific style set for the exhibitor's category
  const styles = CATEGORY_STYLES[exhibitor.category];

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col w-full rounded-xl overflow-hidden cursor-pointer 
                 transition-all duration-300 ease-in-out
                 shadow-md hover:shadow-2xl hover:-translate-y-1`}
    >
      {/* Category Tag */}
      <div
        className={`absolute top-2 right-2 px-3 py-1 text-xs font-bold text-white rounded-full z-10 shadow-lg ${styles.text.replace(
          /text-(.*)-800/,
          "bg-$1-600"
        )}`}
      >
        {exhibitor.category}
      </div>

      {/* Image Container */}
      <div className="relative w-full h-48">
        <Image
          src={exhibitor.imageUrl}
          alt={exhibitor.name}
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Image Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      </div>
      
      {/* Content Area */}
      <div className={`flex-grow flex flex-col justify-between p-4 ${styles.bg}`}>
        <div>
          <h3 className="font-bold text-xl text-gray-900 mb-1 truncate group-hover:text-green-800">
            {exhibitor.name}
          </h3>
          <p className="text-sm text-gray-700 h-10 text-ellipsis overflow-hidden">
            {exhibitor.shortDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
