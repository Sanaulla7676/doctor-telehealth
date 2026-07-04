"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  height?: string;
}

export default function BeforeAfterSlider({ beforeUrl, afterUrl, height = "h-[450px]" }: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${height} rounded-2xl overflow-hidden select-none shadow-lg border border-black/[0.04]`}
      onMouseMove={handleMouseMove}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onTouchMove={handleTouchMove}
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
    >
      {/* Before Image */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src={beforeUrl}
          alt="Before Treatment"
          fill
          className="object-cover"
          sizes="(max-w-1024px) 100vw, 50vw"
        />
        <div className="absolute top-4 left-4 bg-black/60 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-sm z-25">
          Before
        </div>
      </div>

      {/* After Image (clipped width based on sliderPosition) */}
      <div
        className="absolute inset-0 h-full overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <div className="absolute inset-0 w-full h-full" style={{ width: containerRef.current?.getBoundingClientRect().width }}>
          <Image
            src={afterUrl}
            alt="After Treatment"
            fill
            className="object-cover"
            sizes="(max-w-1024px) 100vw, 50vw"
          />
        </div>
        <div className="absolute top-4 right-4 bg-luxAccent/80 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-sm z-25">
          After
        </div>
      </div>

      {/* Split/Divider bar handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-30"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white text-luxDark border border-black/10 rounded-full flex items-center justify-center shadow-lg font-bold text-xs select-none">
          &harr;
        </div>
      </div>
    </div>
  );
}
