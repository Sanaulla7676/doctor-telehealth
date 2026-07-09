"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface GalleryImage {
  src: string;
  category: "clinic" | "remedies" | "academics";
  alt: string;
}

export default function GallerySection() {
  const [activeCategory, setActiveCategory] = useState<"all" | "clinic" | "remedies" | "academics">("all");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const images: GalleryImage[] = [
    { src: "/botonical.png", category: "remedies", alt: "Botanical Plant Extractions" },
    { src: "/Mineral Minerals.jpg", category: "remedies", alt: "Mineral Trituration Setup" },
    { src: "/Potentized Dilutions.jpg", category: "remedies", alt: "Dilution Potentization Process" },
    { src: "/Tissue Bio-Chemic Salts.png", category: "remedies", alt: "Schuessler Tissue Salts" },
    { src: "/Pediatric.jpeg", category: "clinic", alt: "Pediatric Consultation Room" },
    { src: "/Womenwellness.jpeg", category: "clinic", alt: "Women's Wellness Evaluation" },
    { src: "/Dermatology.jpeg", category: "clinic", alt: "Dermatological Case Examination" },
  ];

  const filteredImages = activeCategory === "all" 
    ? images 
    : images.filter(img => img.category === activeCategory);

  useEffect(() => {
    let ctx: any;
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        // Animate all grid items with a premium scale & slide-up stagger
        const items = gridRef.current?.querySelectorAll(".gallery-item");
        if (items && items.length > 0) {
          gsap.fromTo(items, 
            { opacity: 0, y: 50, scale: 0.9, rotate: 1 },
            { 
              opacity: 1, 
              y: 0, 
              scale: 1,
              rotate: 0,
              duration: 0.8, 
              stagger: 0.1, 
              ease: "power2.out",
              scrollTrigger: {
                trigger: gridRef.current,
                start: "top 85%",
                toggleActions: "play none none none"
              }
            }
          );
        }
      });
    })();

    return () => ctx?.revert();
  }, [activeCategory]); // Re-run GSAP when categories change for fresh stagger entry

  return (
    <section id="gallery" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-black/[0.04] font-sans">
      <div className="text-center mb-12">
        <span className="text-luxMuted text-xs uppercase font-extrabold tracking-widest block">
          Visual Tour
        </span>
        <h2 className="text-4xl font-extrabold text-luxDark mt-1 tracking-tight font-serif">
          Clinical Gallery
        </h2>
      </div>

      {/* Categories Tabs */}
      <div className="flex justify-center gap-3 mb-12 text-xs font-bold uppercase tracking-wider">
        {(["all", "clinic", "remedies", "academics"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2.5 rounded-full border transition duration-300 cursor-pointer ${
              activeCategory === cat
                ? "bg-luxDark text-white border-luxDark"
                : "bg-white text-luxMuted border-black/[0.06] hover:border-luxDark hover:text-luxDark"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid Layout */}
      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-2">
        {filteredImages.map((img, idx) => {
          return (
            <div
              key={idx}
              onClick={() => setSelectedImage(img.src)}
              className="gallery-item relative h-60 rounded-[20px] overflow-hidden border border-black/[0.04] group hover:scale-[1.02] transition duration-300 cursor-pointer shadow-sm bg-gray-100"
            >
              <Image
                src={img.src}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                alt={img.alt}
                sizes="(max-w-768px) 100vw, 25vw"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <span className="text-white font-bold text-xs uppercase tracking-wider border border-white/30 px-4 py-2 rounded-full backdrop-blur-sm">
                  View Fullscreen
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={selectedImage}
              className="max-w-full max-h-full object-contain rounded-lg"
              alt="Fullscreen presentation"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-luxAccent text-xl font-bold bg-white/10 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
