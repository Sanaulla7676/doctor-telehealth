"use client";

import { useEffect, useRef } from "react";
import { CheckCircle } from "lucide-react";

const conditions = {
  "Lifestyle & Metabolic": [
    "Diabetes Mellitus","Hypertension","Dyslipidaemia (High Cholesterol)","Obesity",
    "Metabolic Syndrome","Migraine & Recurrent Headache","Thyroid Disorders",
  ],
  "Musculoskeletal": [
    "Osteoarthritis","Cervical & Lumbar Spondylosis","Back Pain","Sciatica",
    "Joint Pain","Frozen Shoulder","Muscle & Ligament Disorders",
  ],
  "Respiratory & Allergic": [
    "Allergic Rhinitis","Sinusitis","Bronchial Asthma","Recurrent URIs",
    "Chronic Cough","Seasonal Allergies",
  ],
  "Skin & Hair": [
    "Acne","Eczema","Psoriasis","Urticaria","Pigmentation Disorders",
    "Hair Fall","Dandruff","Fungal Skin Infections",
  ],
  "Gastrointestinal": [
    "Gastritis","Acid Peptic Symptoms","IBS","Constipation",
    "Mouth Ulcers","Functional Digestive Complaints",
  ],
  "Women's Health": [
    "Menstrual Disorders","PMS","PCOS","Hormonal Imbalance",
    "Perimenopausal Symptoms","Nutrition for Fertility & Pregnancy","Thyroid Concerns",
  ],
  "Mental & Emotional": [
    "Anxiety","Stress-Related Disorders","Mild–Moderate Depressive Symptoms",
    "Sleep Disturbances","Psychosomatic Complaints",
  ],
  "Paediatric Care": [
    "Recurrent Tonsillitis","Adenoid Hypertrophy","Allergic Disorders",
    "Nutritional Counselling","Growth & Development","Recurrent Infections","Behavioural Concerns",
  ],
};

const nutritionFor = [
  "Diabetes Mellitus","Hypertension","Dyslipidaemia","Obesity","Fatty Liver Disease",
  "PCOS","Thyroid Disorders","Gastrointestinal Disorders","Nutritional Deficiencies",
  "Pregnancy & Lactation","Paediatric Nutrition","Geriatric Nutrition",
  "Weight Management","Sports & Lifestyle Nutrition",
];

const assessmentPoints = [
  "Detailed evaluation of presenting complaints",
  "Complete medical and family history",
  "Physical constitution and general health",
  "Lifestyle and dietary assessment",
  "Mental and emotional well-being",
  "Sleep pattern, stress levels, and environmental influences",
  "Individual susceptibility and disease predisposition",
];

const treatmentObjectives = [
  "Address the underlying susceptibility of the individual",
  "Support the body's self-regulatory mechanisms",
  "Improve overall health and quality of life",
  "Reduce the frequency of recurrent illnesses",
  "Promote long-term wellness through individualized care",
];

const clinicalApproach = [
  "Comprehensive clinical evaluation",
  "Individualized homoeopathic prescription",
  "Evidence-informed nutritional counselling",
  "Lifestyle modification guidance",
  "Preventive health education",
  "Regular follow-up and treatment review",
];

export default function PhilosophySection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let ctx: any;
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>(".reveal-up").forEach((el) => {
          gsap.fromTo(el, 
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 85%", once: true }
            }
          );
        });
        gsap.utils.toArray<HTMLElement>(".reveal-left").forEach((el) => {
          gsap.fromTo(el, 
            { x: -60, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.8, ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 85%", once: true }
            }
          );
        });
        gsap.utils.toArray<HTMLElement>(".reveal-right").forEach((el) => {
          gsap.fromTo(el, 
            { x: 60, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.8, ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 85%", once: true }
            }
          );
        });
        gsap.utils.toArray<HTMLElement>(".stagger-children").forEach((parent) => {
          gsap.fromTo((parent as HTMLElement).children, 
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.08, duration: 0.55, ease: "power2.out",
              scrollTrigger: { trigger: parent, start: "top 82%", once: true }
            }
          );
        });
      }, sectionRef);
    })();
    return () => ctx?.revert();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative border-t border-black/[0.04] font-sans space-y-20"
    >
      {/* ── Hero heading ── */}
      <div className="reveal-up text-center">
        <span className="text-luxMuted text-xs uppercase font-extrabold tracking-widest block">Our Ethos</span>
        <h2 className="text-4xl font-extrabold text-luxDark mt-1 tracking-tight font-serif">
          A Holistic Approach to Health and Wellness
        </h2>
        <p className="mt-6 max-w-3xl mx-auto text-sm text-luxMuted leading-relaxed">
          At <strong className="text-luxDark">Homoeopath Way Clinic</strong>, we believe that optimal health is achieved by
          understanding the individual as a whole rather than focusing solely on the disease. As a Postgraduate Homoeopathic
          Physician (MD Homoeopathy) with a Master's Degree in Clinical Nutrition and Dietetics, our approach integrates
          individualized homoeopathic care with evidence-based nutritional and lifestyle guidance to promote overall health
          and well-being.
        </p>
        <p className="mt-4 max-w-3xl mx-auto text-sm text-luxMuted leading-relaxed">
          Every patient is unique, and therefore every treatment plan is carefully tailored according to the individual's
          physical symptoms, medical history, emotional well-being, lifestyle, dietary habits, and constitutional characteristics.
        </p>
      </div>

      {/* ── Philosophy of Care ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <div className="reveal-left space-y-6">
          <span className="text-luxAccent text-xs uppercase font-extrabold tracking-widest">Our Philosophy of Care</span>
          <h3 className="text-2xl font-extrabold text-luxDark font-serif">
            Homoeopathy is based on the principle of individualized treatment
          </h3>
          <p className="text-xs text-luxMuted leading-relaxed">
            Each patient receives a personalized management plan rather than a one-size-fits-all approach.
            Our comprehensive clinical assessment includes:
          </p>
          <ul className="space-y-2">
            {assessmentPoints.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-luxDark">
                <CheckCircle className="text-luxAccent w-4 h-4 mt-0.5 shrink-0" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-luxMuted leading-relaxed italic border-l-2 border-luxAccent pl-3">
            This holistic evaluation helps formulate an individualized treatment strategy aimed at supporting the
            body's natural healing processes while promoting long-term health.
          </p>
        </div>

        <div className="reveal-right space-y-6">
          <div className="bg-white border border-black/[0.04] rounded-[24px] p-8 shadow-sm space-y-4">
            <span className="text-luxAccent text-xs uppercase font-extrabold tracking-widest">Individualized Homoeopathic Management</span>
            <p className="text-xs text-luxMuted leading-relaxed">
              Homoeopathic medicines are selected based on the <strong>totality of symptoms</strong> and the individual's overall
              health profile rather than the disease diagnosis alone. The objective of treatment is to:
            </p>
            <ul className="space-y-2">
              {treatmentObjectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-luxDark">
                  <CheckCircle className="text-luxAccent w-4 h-4 mt-0.5 shrink-0" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Nutrition block ── */}
      <div className="reveal-up bg-luxDark rounded-[28px] p-8 md:p-12 text-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-4">
            <span className="text-luxAccent text-xs uppercase font-extrabold tracking-widest">Integrated Clinical Nutrition</span>
            <h3 className="text-2xl font-extrabold font-serif">
              Personalized Dietary Counselling &amp; Lifestyle Management
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Nutrition plays a vital role in the prevention and management of many acute and chronic health conditions.
              With advanced training in Clinical Nutrition and Dietetics, personalized dietary counselling is incorporated
              whenever appropriate to complement the overall treatment plan. Dietary recommendations are practical,
              culturally appropriate, and tailored to the patient's medical condition, lifestyle, food preferences, and
              nutritional requirements.
            </p>
          </div>
          <div>
            <p className="text-xs text-luxAccent uppercase font-bold tracking-wider mb-3">Individualized nutrition plans for:</p>
            <div className="stagger-children grid grid-cols-2 gap-2">
              {nutritionFor.map((n, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-luxAccent shrink-0" />
                  <span>{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Conditions Grid ── */}
      <div className="space-y-8">
        <div className="reveal-up text-center">
          <span className="text-luxMuted text-xs uppercase font-extrabold tracking-widest">Conditions Commonly Managed</span>
          <h3 className="text-3xl font-extrabold text-luxDark mt-1 font-serif">What We Treat</h3>
        </div>
        <div className="stagger-children grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {Object.entries(conditions).map(([category, items]) => (
            <div key={category} className="bg-white border border-black/[0.04] rounded-[20px] p-5 shadow-sm hover:scale-[1.02] hover:shadow-md transition duration-300">
              <h4 className="text-[10px] font-extrabold text-luxAccent uppercase tracking-wider mb-3 border-b border-black/[0.04] pb-2">
                {category}
              </h4>
              <ul className="space-y-1.5">
                {items.map((item, i) => (
                  <li key={i} className="text-[10px] text-luxMuted flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-luxAccent mt-1 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="reveal-up text-[10px] text-luxMuted text-center italic">
          * Patients requiring surgical or emergency intervention are referred appropriately.
          Homoeopathic care for mental health is provided as part of a comprehensive plan, with referral to specialists whenever indicated.
        </p>
      </div>

      {/* ── Our Clinical Approach ── */}
      <div className="reveal-up bg-white border border-black/[0.04] rounded-[28px] p-8 md:p-12 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <span className="text-luxAccent text-xs uppercase font-extrabold tracking-widest">Our Clinical Approach</span>
            <h3 className="text-2xl font-extrabold text-luxDark font-serif">Every patient receives</h3>
            <ul className="space-y-3">
              {clinicalApproach.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-luxDark">
                  <CheckCircle className="text-luxAccent w-4 h-4 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-luxDark/5 border border-luxDark/10 rounded-[20px] p-6 space-y-3">
            <p className="text-xs text-luxDark font-extrabold font-serif italic text-lg leading-snug">
              "Our goal is not only to address existing health concerns but also to help patients adopt
              healthier habits that support long-term wellness."
            </p>
            <p className="text-[10px] text-luxMuted">— Dr. Varsha Bandi, MD Homoeopathy</p>
          </div>
        </div>
      </div>
    </section>
  );
}
