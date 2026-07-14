"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { doctorData } from "@/data/doctor";
import { Award, Briefcase, GraduationCap, CheckCircle, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── animated counter ── */
function StatCounter({ value, label }: { value: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const target = parseInt(value.replace(/\D/g, ""));
  const suffix = value.replace(/\d/g, "");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 1400, 1);
        setCount(Math.floor(p * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="bg-white/90 border border-black/[0.04] p-5 rounded-2xl shadow-sm text-center">
      <div className="text-3xl font-extrabold text-luxDark font-serif">{count}{suffix}</div>
      <div className="text-[10px] uppercase tracking-wider text-luxMuted font-bold mt-1">{label}</div>
    </div>
  );
}

export default function DoctorSection() {
  const sectionRef   = useRef<HTMLElement>(null);
  const portraitRef  = useRef<HTMLDivElement>(null);
  const overlayRef   = useRef<HTMLDivElement>(null);
  const headingRef   = useRef<HTMLDivElement>(null);
  const statsRef     = useRef<HTMLDivElement>(null);
  const bioRef       = useRef<HTMLDivElement>(null);
  const qualRef      = useRef<HTMLDivElement>(null);
  const expRef       = useRef<HTMLDivElement>(null);
  const skillsRef    = useRef<HTMLDivElement>(null);
  const certsRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ctx: any;
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        /* ── 1. Section heading fade+rise ── */
        gsap.fromTo(headingRef.current,
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: headingRef.current, start: "top 85%" } }
        );

        /* ── 2. Portrait slides in from left, parallax on scroll ── */
        gsap.fromTo(portraitRef.current,
          { x: -120, opacity: 0 },
          { x: 0, opacity: 1, duration: 1.1, ease: "power4.out", scrollTrigger: { trigger: portraitRef.current, start: "top 80%" } }
        );
        gsap.to(portraitRef.current, {
          y: -40,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 1.5,
          },
        });

        /* ── 3. Overlay card on portrait reveals upward ── */
        gsap.fromTo(overlayRef.current,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, delay: 0.4, ease: "power3.out", scrollTrigger: { trigger: portraitRef.current, start: "top 75%" } }
        );

        /* ── 4. Stats bounce in staggered ── */
        gsap.fromTo(statsRef.current!.children,
          { scale: 0.7, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, stagger: 0.15, ease: "back.out(1.7)", scrollTrigger: { trigger: statsRef.current, start: "top 85%" } }
        );

        /* ── 5. Bio card slides from right ── */
        gsap.fromTo(bioRef.current,
          { x: 100, opacity: 0 },
          { x: 0, opacity: 1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: bioRef.current, start: "top 80%" } }
        );

        /* ── 6. Qualification cards stagger from right ── */
        if (qualRef.current) {
          gsap.fromTo(qualRef.current.querySelectorAll(".qual-card"),
            { x: 80, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.7, stagger: 0.15, ease: "power3.out", scrollTrigger: { trigger: qualRef.current, start: "top 80%" } }
          );
        }

        /* ── 7. Timeline entries slide in one by one (storytelling) ── */
        if (expRef.current) {
          gsap.fromTo(expRef.current.querySelectorAll(".exp-item"),
            { x: 60, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.65, stagger: 0.18, ease: "power2.out", scrollTrigger: { trigger: expRef.current, start: "top 80%" } }
          );
          /* line draws downward */
          gsap.fromTo(expRef.current.querySelector(".timeline-line"),
            { scaleY: 0 },
            { scaleY: 1, transformOrigin: "top center", duration: 1.5, ease: "power2.inOut", scrollTrigger: { trigger: expRef.current, start: "top 80%", scrub: 0.5 } }
          );
        }

        /* ── 8. Skills & achievements flip in ── */
        if (skillsRef.current) {
          gsap.fromTo(skillsRef.current.children,
            { rotateY: 15, opacity: 0 },
            { rotateY: 0, opacity: 1, duration: 0.8, stagger: 0.2, ease: "power3.out", scrollTrigger: { trigger: skillsRef.current, start: "top 82%" } }
          );
        }

        /* ── 9. Certs reveal from bottom ── */
        gsap.fromTo(certsRef.current,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: certsRef.current, start: "top 85%" } }
        );

      }, sectionRef);
    })();

    return () => ctx?.revert();
  }, []);

  return (
    <section
      id="doctor"
      ref={sectionRef}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-black/[0.04] relative overflow-hidden"
    >
      {/* Heading */}
      <div ref={headingRef} className="text-center mb-16">
        <span className="text-luxMuted text-xs uppercase font-extrabold tracking-widest font-sans">The Practitioner</span>
        <h1 className="text-4xl font-extrabold text-luxDark mt-1 tracking-tight font-serif">About Dr. Varsha Bandi</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start font-sans">

        {/* LEFT — portrait + stats */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <div ref={portraitRef} className="relative h-[65vh] min-h-[480px] w-full rounded-[32px] overflow-hidden doctor-portrait-container bg-luxDark">
            <Image src="/profile.png" alt="Dr. Varsha Bandi" fill className="object-cover object-top" sizes="(max-width:768px) 100vw, 40vw" priority />
            <div ref={overlayRef} className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-luxDark via-luxDark/80 to-transparent p-8 text-white space-y-3">
              <span className="text-xs uppercase tracking-widest text-luxAccent font-extrabold block">Chief Consultant &amp; Academician</span>
              <h2 className="text-3xl font-extrabold font-serif">Dr. Varsha Bandi</h2>
              <p className="text-xs text-gray-300 italic font-serif leading-relaxed">"Evidence-based homeopathy integrated with clinical nutrition to activate your vital system."</p>
              <div className="flex flex-col gap-2 pt-3 border-t border-white/10 text-xs text-gray-300">
                <a href={`mailto:${doctorData.contact.email}`} className="hover:text-luxAccent transition flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-luxAccent" /><span>{doctorData.contact.email}</span>
                </a>
                <a href={`tel:${doctorData.contact.phone.replace(/\s+/g,"")}`} className="hover:text-luxAccent transition flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-luxAccent" /><span>{doctorData.contact.phone}</span>
                </a>
              </div>
            </div>
          </div>

          <div ref={statsRef} className="grid grid-cols-2 gap-4">
            {doctorData.stats.map((s, i) => <StatCounter key={i} value={s.value} label={s.label} />)}
          </div>
        </div>

        {/* RIGHT — scrolling story */}
        <div className="lg:col-span-7 space-y-12">

          {/* Bio */}
          <div ref={bioRef} className="bg-white border border-black/[0.04] p-8 rounded-[24px] shadow-sm hover:scale-[1.01] transition duration-300">
            <h3 className="font-extrabold text-luxDark text-lg mb-4 font-serif italic border-b border-black/[0.04] pb-2">Career Objective &amp; Philosophy</h3>
            <p className="text-xs text-luxMuted leading-relaxed">{doctorData.objective}</p>
            <p className="text-xs text-luxMuted leading-relaxed mt-4">{doctorData.biography} {doctorData.philosophy}</p>
          </div>

          {/* Qualifications */}
          <div ref={qualRef} className="space-y-6">
            <h3 className="font-extrabold text-luxDark text-xl font-serif flex items-center gap-2">
              <GraduationCap className="text-luxAccent w-6 h-6" /><span>Educational Qualifications</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {doctorData.qualifications.map((q, i) => (
                <div key={i} className="qual-card bg-white border border-black/[0.04] p-6 rounded-[20px] shadow-sm flex flex-col justify-between hover:scale-[1.02] hover:shadow-md transition duration-300">
                  <div>
                    <span className="text-xs font-bold text-luxAccent uppercase tracking-wider block mb-1">{q.degree}</span>
                    <h4 className="font-extrabold text-luxDark text-sm">{q.institution}</h4>
                    <p className="text-[11px] text-luxMuted mt-1 leading-normal">{q.university}</p>
                  </div>
                  <span className="text-xs font-bold text-luxDark mt-4 block pt-2 border-t border-black/[0.04]">Passed: {q.year}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Professional Experience — storytelling timeline */}
          <div ref={expRef} className="space-y-6">
            <h3 className="font-extrabold text-luxDark text-xl font-serif flex items-center gap-2">
              <Briefcase className="text-luxAccent w-5 h-5" /><span>Professional Experience</span>
            </h3>
            <div className="relative pl-6 ml-2 space-y-8">
              {/* animated vertical line */}
              <div className="timeline-line absolute left-0 top-0 bottom-0 w-px bg-black/10" />
              {doctorData.experiences.map((exp, i) => (
                <div key={i} className="exp-item relative">
                  <div className={cn("absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-luxBg", i === 0 || i === 4 ? "bg-luxAccent" : "bg-luxDark")} />
                  <span className="text-[10px] font-bold text-luxAccent uppercase tracking-wider block">{exp.period}</span>
                  <h4 className="font-extrabold text-luxDark text-sm">{exp.role}</h4>
                  {exp.department && <span className="block text-[11px] text-luxMuted font-semibold">{exp.department}</span>}
                  <p className="text-[11px] text-luxMuted mt-1">{exp.institution}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Skills & Achievements */}
          <div ref={skillsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-black/[0.04] p-6 rounded-[24px] shadow-sm space-y-4 hover:scale-[1.01] transition duration-300">
              <h4 className="font-extrabold text-luxDark text-sm uppercase tracking-wider border-b border-black/[0.04] pb-2">Skills &amp; Focus</h4>
              <ul className="space-y-2 text-xs text-luxDark">
                {doctorData.skills.map((skill, i) => (
                  <li key={i} className="flex items-start"><CheckCircle className="text-luxAccent w-4 h-4 mt-0.5 mr-2 shrink-0" /><span>{skill}</span></li>
                ))}
              </ul>
            </div>
            <div className="bg-white border border-black/[0.04] p-6 rounded-[24px] shadow-sm space-y-4 hover:scale-[1.01] transition duration-300">
              <h4 className="font-extrabold text-luxDark text-sm uppercase tracking-wider border-b border-black/[0.04] pb-2">Key Achievements</h4>
              <ul className="space-y-3 text-xs text-luxMuted leading-relaxed">
                {doctorData.achievements.map((a, i) => (
                  <li key={i} className="flex items-start"><Award className="text-luxAccent w-4 h-4 mt-0.5 mr-2 shrink-0" /><span>{a}</span></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Certifications */}
          <div ref={certsRef} className="bg-white border border-black/[0.04] p-6 rounded-[24px] shadow-sm space-y-4 hover:scale-[1.01] transition duration-300">
            <h4 className="font-extrabold text-luxDark text-sm uppercase tracking-wider border-b border-black/[0.04] pb-2 flex items-center gap-2">
              <Award className="text-luxAccent w-4 h-4" /><span>Certifications &amp; Trainings</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-luxMuted leading-relaxed">
              {doctorData.certifications.map((c, i) => (
                <div key={i} className="border-b border-black/[0.03] pb-2 last:border-b-0">
                  <strong>{c.title}</strong>
                  <span className="block text-[10px] text-luxAccent font-semibold">{c.authority} — {c.date}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
