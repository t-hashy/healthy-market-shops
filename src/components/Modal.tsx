"use client";

import Image from "next/image";
import { Exhibitor, CATEGORY_STYLES } from "../types";
import { useEffect } from "react";

type Props = {
  exhibitor: Exhibitor | null;
  onClose: () => void;
};

export default function Modal({ exhibitor, onClose }: Props) {
  // Effect to handle 'Escape' key press for closing the modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // If no exhibitor is selected, render nothing
  if (!exhibitor) {
    return null;
  }

  const styles = CATEGORY_STYLES[exhibitor.category];

  return (
    // The Modal_overlay handles the background and the fade-in animation
    <div
      id="modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in"
    >
      {/* The Modal_content contains the details, handles the slide-up animation and stops click propagation */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative flex flex-col w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl 
                   overflow-hidden animate-slide-up-fade`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-3 right-3 z-20 p-2 text-gray-500 bg-white/50 rounded-full
                     hover:bg-white hover:text-gray-800 transition-all duration-200"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            ></path>
          </svg>
        </button>

        {/* Image container */}
        <div className="relative w-full h-56 md:h-72 flex-shrink-0">
          <Image
            src={exhibitor.imageUrl}
            alt={exhibitor.name}
            className="object-cover"
            fill
          />
           <div className={`absolute bottom-0 left-0 p-4 ${styles.bg} rounded-tr-xl shadow-md`}>
             <span className={`px-3 py-1 text-sm font-bold ${styles.text} rounded-full`}>
              {exhibitor.category}
            </span>
           </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-3">{exhibitor.name}</h2>
          <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
            {exhibitor.longDesc}
          </p>

          {exhibitor.websiteUrl && (
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-800 mb-1">ウェブサイト</h3>
              <a
                href={exhibitor.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:underline"
              >
                詳細はこちら
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0l-7 7"></path>
                </svg>
              </a>
            </div>
          )}

          {exhibitor.address && (
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-800 mb-1">住所</h3>
              <p className="text-gray-700">{exhibitor.address}</p>
            </div>
          )}

          {(exhibitor.facebookUrl || exhibitor.instagramUrl || exhibitor.twitterUrl) && (
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-800 mb-2">ソーシャルメディア</h3>
              <div className="flex flex-wrap gap-3">
                {exhibitor.facebookUrl && (
                  <a
                    href={exhibitor.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.776-3.89 1.094 0 2.24.195 2.24.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h3.046l-.497 2.987h-2.549V22C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                    </svg>
                    Facebook
                  </a>
                )}
                {exhibitor.instagramUrl && (
                  <a
                    href={exhibitor.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-full hover:bg-pink-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 0C8.783 0 8.358.012 7.026.071c-1.341.058-2.277.29-3.082.604-.813.315-1.493.753-2.176 1.436-.684.684-1.122 1.363-1.437 2.176-.314.805-.546 1.741-.605 3.082C.012 8.358 0 8.783 0 12c0 3.217.012 3.642.071 4.974.058 1.341.29 2.277.604 3.082.315.813.753 1.493 1.436 2.176.684.684 1.363 1.122 2.176 1.437.805.314 1.741.546 3.082.605C8.358 23.988 8.783 24 12 24c3.217 0 3.642-.012 4.974-.071 1.341-.058 2.277-.29 3.082-.604.813-.315 1.493-.753 2.176-1.436.684-.684 1.122-1.363 1.437-2.176.314-.805.546-1.741.605-3.082.059-1.332.071-1.757.071-4.974 0-3.217-.012-3.642-.071-4.974-.058-1.341-.29-2.277-.604-3.082-.315-.813-.753-1.493-1.436-2.176-.684-.684-1.363-1.122-2.176-1.437-.805-.314-1.741-.546-3.082-.605C15.642.012 15.217 0 12 0zm0 4.385c2.196 0 2.457.009 3.32.048 1.05.047 1.62.222 1.956.355.433.176.732.373.99.631.258.258.455.557.631.99.133.336.308.906.355 1.956.039.863.048 1.124.048 3.32 0 2.196-.009 2.457-.048 3.32-.047 1.05-.222 1.62-.355 1.956-.176.433-.373.732-.631.99-.258.258-.557.455-.99.631-.336.133-.906.308-1.956.355-.863.039-1.124.048-3.32.048-2.196 0-2.457-.009-3.32-.048-1.05-.047-1.62-.222-1.956-.355-.433-.176-.732-.373-.99-.631-.258-.258-.455-.557-.631-.99-.133-.336-.308-.906-.355-1.956-.039-.863-.048-1.124-.048-3.32 0-2.196.009-2.457.048-3.32.047-1.05.222-1.62.355-1.956.176-.433.373-.732.631-.99.258-.258.557-.455.99-.631.336-.133.906-.308 1.956-.355.863-.039 1.124-.048 3.32-.048zm0 2.438c-2.613 0-4.742 2.129-4.742 4.742S9.387 16.305 12 16.305s4.742-2.129 4.742-4.742-2.129-4.742-4.742-4.742zm0 2.438c1.31 0 2.37.587 2.37 2.37s-1.06 2.37-2.37 2.37-2.37-.587-2.37-2.37 1.06-2.37 2.37-2.37z" />
                    </svg>
                    Instagram
                  </a>
                )}
                {exhibitor.twitterUrl && (
                  <a
                    href={exhibitor.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 bg-blue-400 text-white rounded-full hover:bg-blue-500 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.814L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Twitter
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
