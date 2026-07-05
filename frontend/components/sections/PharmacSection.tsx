"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { pharmacopoeiaData, classicalMethodologies } from "@/data/pharmacopoeia";

export default function PharmacSection() {
  return (
    <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-black/[0.04] font-sans">
      <div className="text-center mb-16">
        <span className="text-luxMuted text-xs uppercase font-extrabold tracking-widest block">
          Our Methodology
        </span>
        <h2 className="text-4xl font-extrabold text-luxDark mt-1 tracking-tight font-serif">
          Remedy Potentization Science
        </h2>
      </div>

      {/* Grid listing of remedies */}
      <div className="mb-16">
        <h3 className="text-2xl font-extrabold text-luxDark mb-8 text-center">
          Foundational Elements of our Pharmacopoeia
        </h3>
        
        <div id="pharmacopoeia-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-2 overflow-hidden">
          {pharmacopoeiaData.map((item, idx) => {
            const isLeft = idx < 2;

            return (
              <motion.div
                key={item.id}
                className="bg-white border border-black/[0.04] rounded-[20px] shadow-sm overflow-hidden flex flex-col justify-between hover:scale-[1.03] hover:shadow-lg transition duration-300"
                initial={{ opacity: 0, x: isLeft ? -70 : 70 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: "easeOut", delay: (idx % 2) * 0.15 }}
              >
                <div className="h-44 overflow-hidden bg-gray-100 relative">
                  <Image
                    src={item.imageUrl}
                    fill
                    className="object-cover"
                    alt={item.title}
                    sizes="(max-w-768px) 100vw, 25vw"
                  />
                </div>
                <div className="p-6">
                  <h4 className="font-bold text-luxDark text-sm mb-2">{item.title}</h4>
                  <p className="text-[11px] text-luxMuted leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Standards list */}
      <div className="max-w-3xl mx-auto">
        <div className="space-y-6">
          <h3 className="font-extrabold text-xl text-luxDark text-center">
            Supported Classical Methodologies
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {classicalMethodologies.map((method, idx) => (
              <div
                key={idx}
                className="bg-white border border-black/[0.04] p-4 rounded-xl text-center font-bold text-xs text-luxDark shadow-sm"
              >
                {method}
              </div>
            ))}
            <div className="bg-white border border-black/[0.04] p-4 rounded-xl text-center font-bold text-xs text-luxDark shadow-sm col-span-2 md:col-span-4">
              Sankaran Sensation Protocols
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
