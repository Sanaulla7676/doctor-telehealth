"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { doctorData } from "@/data/doctor";
import { Award, Briefcase, GraduationCap, CheckCircle, Mail, Phone, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Stat counter sub-component
function StatCounter({ value, label }: { value: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const targetNumber = parseInt(value.replace(/\D/g, ""));
  const suffix = value.replace(/\d/g, "");

  useEffect(() => {
    let observer: IntersectionObserver;
    let startTimestamp: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / 1500, 1);
      setCount(Math.floor(progress * targetNumber));
      if (progress < 1) {
        window.requestAnimationFrame(animate);
      }
    };

    if (ref.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            window.requestAnimationFrame(animate);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(ref.current);
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [targetNumber]);

  return (
    <div ref={ref} className="bg-white/80 border border-black/[0.04] p-5 rounded-2xl shadow-sm text-center">
      <div className="text-3xl font-extrabold text-luxDark font-serif">
        {count}
        {suffix}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-luxMuted font-bold mt-1">
        {label}
      </div>
    </div>
  );
}

export default function DoctorSection() {
  return (
    <section id="doctor" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-black/[0.04] relative">
      <div className="text-center mb-16">
        <span className="text-luxMuted text-xs uppercase font-extrabold tracking-widest font-sans">
          The Practitioner
        </span>
        <h1 className="text-4xl font-extrabold text-luxDark mt-1 tracking-tight font-serif">
          About Dr. Varsha Bandi
        </h1>
      </div>

      {/* Asymmetric Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start font-sans overflow-hidden">
        
        {/* Sticky Portrait Column (Left 5-Cols) - slides/pops in from the left */}
        <motion.div 
          className="lg:col-span-5 lg:sticky lg:top-24 space-y-6"
          initial={{ opacity: 0, x: -100 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="relative h-[65vh] min-h-[480px] w-full rounded-[32px] overflow-hidden doctor-portrait-container bg-luxDark">
            <Image
              src="/profile.png"
              alt="Dr. Varsha Bandi"
              fill
              className="object-cover object-top"
              sizes="(max-w-768px) 100vw, 40vw"
              priority
            />
            {/* Elegant overlay card at bottom */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-luxDark via-luxDark/80 to-transparent p-8 text-white space-y-3">
              <span className="text-xs uppercase tracking-widest text-luxAccent font-extrabold block">
                Chief Consultant & Academician
              </span>
              <h2 className="text-3xl font-extrabold font-serif">
                Dr. Varsha Bandi
              </h2>
              <p className="text-xs text-gray-300 italic font-serif leading-relaxed">
                "Evidence-based homeopathy integrated with clinical nutrition to activate your vital system."
              </p>
              
              <div className="flex flex-col gap-2 pt-3 border-t border-white/10 text-xs text-gray-300">
                <a href={`mailto:${doctorData.contact.email}`} className="hover:text-luxAccent transition flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-luxAccent" />
                  <span>{doctorData.contact.email}</span>
                </a>
                <a href={`tel:${doctorData.contact.phone.replace(/\s+/g, '')}`} className="hover:text-luxAccent transition flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-luxAccent" />
                  <span>{doctorData.contact.phone}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Animated Statistics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {doctorData.stats.map((stat, i) => (
              <StatCounter key={i} value={stat.value} label={stat.label} />
            ))}
          </div>
        </motion.div>

        {/* Scrolling Biography & Qualifications (Right 7-Cols) - slides/pops in from the right */}
        <motion.div 
          className="lg:col-span-7 space-y-12"
          initial={{ opacity: 0, x: 100 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          
          {/* Biography Objective */}
          <div className="bg-white border border-black/[0.04] p-8 rounded-[24px] shadow-sm hover:scale-[1.01] transition duration-300">
            <h3 className="font-extrabold text-luxDark text-lg mb-4 font-serif italic border-b border-black/[0.04] pb-2">
              Career Objective & Philosophy
            </h3>
            <p className="text-xs text-luxMuted leading-relaxed">
              {doctorData.objective}
            </p>
            <p className="text-xs text-luxMuted leading-relaxed mt-4">
              {doctorData.biography} {doctorData.philosophy}
            </p>
          </div>

          {/* Qualifications Grid */}
          <div className="space-y-6">
            <h3 className="font-extrabold text-luxDark text-xl font-serif flex items-center gap-2">
              <GraduationCap className="text-luxAccent w-6 h-6" />
              <span>Educational Qualifications</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {doctorData.qualifications.map((q, i) => (
                <div
                  key={i}
                  className="bg-white border border-black/[0.04] p-6 rounded-[20px] shadow-sm flex flex-col justify-between hover:scale-[1.02] hover:shadow-md transition duration-300"
                >
                  <div>
                    <span className="text-xs font-bold text-luxAccent uppercase tracking-wider block mb-1">
                      {q.degree}
                    </span>
                    <h4 className="font-extrabold text-luxDark text-sm">{q.institution}</h4>
                    <p className="text-[11px] text-luxMuted mt-1 leading-normal">{q.university}</p>
                  </div>
                  <span className="text-xs font-bold text-luxDark mt-4 block pt-2 border-t border-black/[0.04]">
                    Passed: {q.year}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Professional Experience */}
          <div className="space-y-6">
            <h3 className="font-extrabold text-luxDark text-xl font-serif flex items-center gap-2">
              <Briefcase className="text-luxAccent w-5 h-5" />
              <span>Professional Experience</span>
            </h3>
            
            <div className="relative border-l border-black/10 pl-6 ml-2 space-y-8">
              {doctorData.experiences.map((exp, i) => (
                <div key={i} className="relative">
                  <div
                    className={cn(
                      "absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-luxBg",
                      i === 0 || i === 4 ? "bg-luxAccent" : "bg-luxDark"
                    )}
                  />
                  <span className="text-[10px] font-bold text-luxAccent uppercase tracking-wider block">
                    {exp.period}
                  </span>
                  <h4 className="font-extrabold text-luxDark text-sm">{exp.role}</h4>
                  {exp.department && (
                    <span className="block text-[11px] text-luxMuted font-semibold">
                      {exp.department}
                    </span>
                  )}
                  <p className="text-[11px] text-luxMuted mt-1">{exp.institution}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Skills, Achievements & Certifications columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Skills & Focus */}
            <div className="bg-white border border-black/[0.04] p-6 rounded-[24px] shadow-sm space-y-4 hover:scale-[1.01] transition duration-300">
              <h4 className="font-extrabold text-luxDark text-sm uppercase tracking-wider border-b border-black/[0.04] pb-2">
                Skills & Focus
              </h4>
              <ul className="space-y-2 text-xs text-luxDark">
                {doctorData.skills.map((skill, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle className="text-luxAccent w-4 h-4 mt-0.5 mr-2 shrink-0" />
                    <span>{skill}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Achievements */}
            <div className="bg-white border border-black/[0.04] p-6 rounded-[24px] shadow-sm space-y-4 hover:scale-[1.01] transition duration-300">
              <h4 className="font-extrabold text-luxDark text-sm uppercase tracking-wider border-b border-black/[0.04] pb-2">
                Key Achievements
              </h4>
              <ul className="space-y-3 text-xs text-luxMuted leading-relaxed">
                {doctorData.achievements.map((ach, i) => (
                  <li key={i} className="flex items-start">
                    <Award className="text-luxAccent w-4 h-4 mt-0.5 mr-2 shrink-0" />
                    <span>{ach}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Certifications & Training */}
          <div className="bg-white border border-black/[0.04] p-6 rounded-[24px] shadow-sm space-y-4 hover:scale-[1.01] transition duration-300">
            <h4 className="font-extrabold text-luxDark text-sm uppercase tracking-wider border-b border-black/[0.04] pb-2 flex items-center gap-2">
              <Award className="text-luxAccent w-4 h-4" />
              <span>Certifications & Trainings</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-luxMuted leading-relaxed">
              {doctorData.certifications.map((cert, i) => (
                <div key={i} className="border-b border-black/[0.03] pb-2 last:border-b-0">
                  <strong>{cert.title}</strong>
                  <span className="block text-[10px] text-luxAccent font-semibold">
                    {cert.authority} — {cert.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
