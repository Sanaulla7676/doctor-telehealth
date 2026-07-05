"use client";

import Image from "next/image";
import { servicesData } from "@/data/services";
import { HeartPulse, Baby, Venus, Brain, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const iconMap: Record<string, any> = {
  HeartPulse: HeartPulse,
  Baby: Baby,
  Venus: Venus,
  Activity: Brain, // maps mental health to brain
  Sparkles: Sparkles,
  ShieldAlert: ShieldCheck // maps autoimmune to shieldcheck
};

export default function ServicesSection() {
  const scrollToContact = () => {
    const element = document.getElementById("contact");
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-black/[0.04] relative">
      <div className="text-center mb-16">
        <span className="text-luxMuted text-xs uppercase font-extrabold tracking-widest font-sans">
          Specialized Care
        </span>
        <h1 className="text-4xl font-extrabold text-luxDark mt-1 tracking-tight font-serif">
          Homeopathic Treatments
        </h1>
      </div>

      {/* Specialized Treatment Cards */}
      <div id="services-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2 font-sans mb-16 overflow-hidden">
        {servicesData.map((service, idx) => {
          const Icon = iconMap[service.icon] || HeartPulse;
          const isEven = idx % 2 === 0;

          return (
            <motion.div
              key={service.id}
              onClick={scrollToContact}
              className="relative h-64 rounded-[24px] overflow-hidden shadow-sm border border-black/[0.04] group hover:scale-[1.03] hover:shadow-lg transition-all duration-500 cursor-pointer bg-luxDark"
              initial={{ opacity: 0, x: isEven ? -60 : 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: (idx % 3) * 0.1 }}
            >
              {service.mediaType === "video" ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 opacity-70"
                >
                  <source src={service.mediaUrl} type="video/mp4" />
                </video>
              ) : (
                <div className="absolute inset-0 w-full h-full transition-transform duration-700 ease-out group-hover:scale-110 opacity-70">
                  {service.mediaUrl.startsWith("http") ? (
                    <img
                      src={service.mediaUrl}
                      className="w-full h-full object-cover"
                      alt={service.title}
                      loading="lazy"
                    />
                  ) : (
                    <Image
                      src={service.mediaUrl}
                      fill
                      className="object-cover"
                      alt={service.title}
                      sizes="(max-w-768px) 100vw, 30vw"
                    />
                  )}
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
              
              <div className="absolute bottom-5 left-5 right-5 z-10 flex flex-col items-start text-white space-y-1">
                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-2">
                  <Icon className="text-white w-4.5 h-4.5" />
                </div>
                <h4 className="font-extrabold text-sm tracking-wider uppercase flex items-center gap-1.5 w-full">
                  <span>{service.title}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </h4>
                <p className="text-[10px] text-gray-300 mt-0.5 leading-normal max-w-xs">
                  {service.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Promise Block */}
      <div className="bg-white border border-black/[0.04] rounded-[28px] p-8 md:p-12 flex flex-col lg:flex-row gap-12 shadow-sm relative z-10 font-sans">
        <div className="lg:w-1/2 space-y-4">
          <span className="text-luxMuted text-xs font-extrabold uppercase tracking-widest">
            Our Promise
          </span>
          <h3 className="text-2xl font-extrabold text-luxDark tracking-tight">
            Your complete journey to long-term health
          </h3>
          <p className="text-xs text-luxMuted leading-relaxed">
            We don't simply target symptoms; we prioritize your complete physical and emotional recovery through safe, individualized therapies you can depend on.
          </p>
        </div>
        
        <div className="lg:w-1/2 grid grid-cols-2 gap-6 text-xs text-luxMuted">
          <div>
            <h4 className="font-bold text-luxDark mb-1">Tailored Care</h4>
            <p>Remedies selected to match your individual physical and emotional profile.</p>
          </div>
          <div>
            <h4 className="font-bold text-luxDark mb-1">Clinically Qualified</h4>
            <p>Consultations managed by highly experienced medical practitioners.</p>
          </div>
          <div>
            <h4 className="font-bold text-luxDark mb-1">Continuous Monitoring</h4>
            <p>Ongoing check-ups and potencies adjusted according to your healing rate.</p>
          </div>
          <div>
            <h4 className="font-bold text-luxDark mb-1">Gentle Recovery</h4>
            <p>Highly effective, serialized potencies devoid of side-effects.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
