"use client";

import { motion } from "framer-motion";

export default function PhilosophySection() {
  const principles = [
    {
      title: "Individualized Assessment",
      description: "We evaluate your physical, emotional, and mental state in detail, recognizing that disease manifests uniquely in every individual."
    },
    {
      title: "Natural Activation",
      description: "Remedies act as gentle bio-catalysts, supporting your immune and endocrine systems rather than suppressing symptoms."
    },
    {
      title: "Systemic Cure",
      description: "We aim to treat the root cause, strengthening your immune and nervous systems to prevent the recurrence of illness over time."
    }
  ];

  return (
    <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative border-t border-black/[0.04] font-sans">
      <motion.div 
        className="text-center mb-16"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
      >
        <span className="text-luxMuted text-xs uppercase font-extrabold tracking-widest block">
          Our Ethos
        </span>
        <h2 className="text-4xl font-extrabold text-luxDark mt-1 tracking-tight font-serif">
          Holistic Healing Philosophy
        </h2>
      </motion.div>

      <motion.div 
        className="flex flex-col items-center mb-16 relative z-10"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="max-w-3xl text-center space-y-6">
          <p className="text-sm md:text-base leading-relaxed text-luxMuted italic font-serif">
            "Homeopathy is the safest and most reliable system of medicine which heals gently, permanently, and at the core level without any toxic loading of the vital organs."
          </p>
          <p className="text-xs md:text-sm text-luxMuted leading-relaxed">
            By studying constitutional patterns in harmony with modern physiological biochemistry, we select custom serial remedies that activate natural recovery. We integrate target clinical dietetics and lifestyle changes to deliver lasting recovery.
          </p>
        </div>
      </motion.div>

      {/* Core Principles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        {principles.map((pr, idx) => (
          <motion.div
            key={idx}
            className="bg-white border border-black/[0.04] p-8 rounded-[24px] shadow-sm hover:scale-[1.02] hover:shadow-md transition duration-300 flex flex-col justify-between"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: idx * 0.15 }}
          >
            <div>
              <span className="text-[10px] font-bold text-luxAccent uppercase tracking-widest block mb-2">
                0{idx + 1}. Principle
              </span>
              <h3 className="font-extrabold text-luxDark text-base mb-2">{pr.title}</h3>
              <p className="text-xs text-luxMuted leading-relaxed">{pr.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
