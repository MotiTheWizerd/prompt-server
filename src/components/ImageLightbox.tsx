"use client";

import { useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useFlowStore } from "@/store/flow-store";

/**
 * Full-screen image lightbox with paging between all images in the active flow.
 * Images are collected from node data (uploaded) and execution outputs (generated).
 */
export function ImageLightbox() {
  const lightboxImage = useFlowStore((s) => s.lightboxImage);
  const closeLightbox = useFlowStore((s) => s.closeLightbox);
  const openLightbox = useFlowStore((s) => s.openLightbox);

  // Select stable references from the store
  const nodes = useFlowStore((s) => s.flows[s.activeFlowId]?.nodes);
  const nodeOutputs = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs);

  // Derive image list from nodes + outputs (only recomputes when they change)
  const allImages = useMemo(() => {
    if (!nodes) return [];
    const images: string[] = [];
    const seen = new Set<string>();

    const addImage = (img: string) => {
      const key = img.slice(0, 64);
      if (!seen.has(key)) {
        seen.add(key);
        images.push(img);
      }
    };

    for (const node of nodes) {
      const img = node.data?.image as string;
      if (img) addImage(img);
    }

    if (nodeOutputs) {
      for (const output of Object.values(nodeOutputs)) {
        if (output?.image) addImage(output.image);
      }
    }

    return images;
  }, [nodes, nodeOutputs]);

  const currentIndex = useMemo(() => {
    if (!lightboxImage) return -1;
    const key = lightboxImage.slice(0, 64);
    return allImages.findIndex((img) => img.slice(0, 64) === key);
  }, [lightboxImage, allImages]);

  const navigate = useCallback(
    (delta: number) => {
      if (allImages.length === 0) return;
      const next = (currentIndex + delta + allImages.length) % allImages.length;
      openLightbox(allImages[next]);
    },
    [currentIndex, allImages, openLightbox]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxImage) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") navigate(-1);
      else if (e.key === "ArrowRight") navigate(1);
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [lightboxImage, closeLightbox, navigate]);

  if (!lightboxImage) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={closeLightbox}
    >
      {/* Close button */}
      <button
        onClick={closeLightbox}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      {allImages.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white/70 text-sm font-medium">
          {currentIndex + 1} / {allImages.length}
        </div>
      )}

      {/* Previous button */}
      {allImages.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(-1);
          }}
          className="absolute left-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Image */}
      <img
        src={lightboxImage}
        alt="Lightbox view"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next button */}
      {allImages.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(1);
          }}
          className="absolute right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
