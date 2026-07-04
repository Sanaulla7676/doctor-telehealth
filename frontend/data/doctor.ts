export interface Qualification {
  degree: string;
  institution: string;
  university: string;
  year: string;
}

export interface Experience {
  period: string;
  role: string;
  department?: string;
  institution: string;
}

export interface Certification {
  title: string;
  authority: string;
  date: string;
}

export interface Doctor {
  name: string;
  credentials: string;
  title: string;
  subtitle: string;
  tagline: string;
  objective: string;
  biography: string;
  philosophy: string;
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  stats: {
    value: string;
    label: string;
  }[];
  qualifications: Qualification[];
  experiences: Experience[];
  skills: string[];
  achievements: string[];
  certifications: Certification[];
}

export const doctorData: Doctor = {
  name: "Dr. Varsha Bandi",
  credentials: "BHMS, MD (Hom)",
  title: "Professor & HOD",
  subtitle: "Associate Professor, Nutritionist & Classical Homeopath",
  tagline: "Dedicated to evidence-based holistic healthcare and clinical excellence.",
  objective: "Experienced and dedicated Associate Professor in Homeopathy with over 7 years and 10 months of teaching and clinical experience. Adept at guiding undergraduate students and delivering quality education in accordance with NCH norms. Seeking to contribute to holistic medical education and evidence-based homeopathy.",
  biography: "Dr. Varsha Bandi is a highly qualified homeopathic clinician and educator. Combining classical homeopathic principles with modern clinical nutrition, yoga instruction, and clinical research methodologies, she provides comprehensive, personalized, and deep-acting therapies for acute and chronic conditions.",
  philosophy: "We don't simply target symptoms; we prioritize your complete physical and emotional recovery through safe, individualized therapies you can depend on. Our treatment aims to support the body's natural vital force to achieve long-term systemic balance.",
  contact: {
    email: "drvarshabandi@gmail.com",
    phone: "+91 9902684355",
    address: "14, 11th Cross, 1st B Main Rd, behind Indian Bank, Prashanth Nagar, Bengaluru, Karnataka 560079"
  },
  stats: [
    { value: "15+", label: "Years Practice" },
    { value: "3K+", label: "Patients Treated" },
    { value: "8+", label: "Academic Years" },
    { value: "6+", label: "Certifications" }
  ],
  qualifications: [
    {
      degree: "MD (Hom) — Repertory",
      institution: "BHMC, Belgaum",
      university: "Rajiv Gandhi University of Health Sciences (RGUHS)",
      year: "2010"
    },
    {
      degree: "BHMS",
      institution: "BHMC, Belgaum",
      university: "Rajiv Gandhi University of Health Sciences (RGUHS)",
      year: "2007"
    },
    {
      degree: "MSc — Clinical Nutrition & Dietetics",
      institution: "KSOU, Mysore",
      university: "Karnataka State Open University",
      year: "2022"
    },
    {
      degree: "Acupuncture & Acupressure (Ach)",
      institution: "Academy of Acupuncture & Acupressure",
      university: "Professional Certification, Bangalore",
      year: "2018"
    },
    {
      degree: "Yoga Instructor Certificate (YIC)",
      institution: "SGS International Yoga Foundation College",
      university: "VYASA Janapada Folklore University",
      year: "2021"
    },
    {
      degree: "Clinical Research & Medical Writing",
      institution: "Karnataka Institute of Clinical Research",
      university: "Professional Certification, Bangalore",
      year: "2025"
    }
  ],
  experiences: [
    {
      period: "Jan 2026 – Present",
      role: "Professor and HOD",
      department: "Department of Physiology and Biochemistry",
      institution: "Anuradha Homoeopathic Medical College and Hospital, Bengaluru"
    },
    {
      period: "Nov 2022 – Jan 2026",
      role: "Associate Professor",
      department: "Department of Physiology and Biochemistry",
      institution: "Anuradha Homoeopathic Medical College and Hospital, Bengaluru"
    },
    {
      period: "Apr 2018 – Oct 2022",
      role: "Assistant Professor",
      department: "Department of Physiology and Biochemistry",
      institution: "Anuradha Homoeopathic Medical College and Hospital, Bengaluru"
    },
    {
      period: "Jan 2007 – May 2007",
      role: "Lecturer",
      department: "Department of Pathology",
      institution: "AL-AMAAN Homoeopathic Medical College and Hospital, Bijapur"
    },
    {
      period: "Since 2010",
      role: "Senior Consultant Homeopath",
      institution: "Homoeopathway Clinic, Bengaluru & Gangavathi"
    }
  ],
  skills: [
    "Academic Planning & NCH Curriculum",
    "Clinical Diagnostics & Classical Case-Taking",
    "Research Methodology & Statistical Analysis",
    "Clinical Nutrition, Dietetics & Yoga Therapy",
    "Student Mentoring & Academic Leadership"
  ],
  achievements: [
    "Academic research guide for RGUHS postgraduate and undergraduate students.",
    "Research guide for NCH research programmes.",
    "Served as university invigilator, examiner, and paper evaluator."
  ],
  certifications: [
    {
      title: "Basic Course in Educational Methodology (BCEM)",
      authority: "RGUHS",
      date: "Feb 2025"
    },
    {
      title: "CME-Pharmacovigilance sensitization programme",
      authority: "RGUHS",
      date: "Feb 2025"
    },
    {
      title: "National Homoeopathic Seminar participation",
      authority: "IHA",
      date: "2024 & 2025"
    },
    {
      title: "Foundation Course in Educational Methodology",
      authority: "RAATI LMS, RGUHS",
      date: "Jan 2024"
    },
    {
      title: "Shiksha X-CBDC implementation support course",
      authority: "NCH",
      date: "Apr 2023"
    },
    {
      title: "CBDC Training Program for 1st BHMS",
      authority: "NCH, Kottayam, Kerala",
      date: "Feb 2021"
    }
  ]
};
