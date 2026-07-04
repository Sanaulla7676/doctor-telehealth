export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  mediaType: "image" | "video";
  mediaUrl: string;
}

export const servicesData: ServiceItem[] = [
  {
    id: "chronic",
    title: "Chronic Illnesses",
    description: "Deep constitutional therapy for migraines, asthma, and joint disorders.",
    icon: "HeartPulse",
    mediaType: "video",
    mediaUrl: "/chronicaldesease.mp4"
  },
  {
    id: "pediatric",
    title: "Pediatric Care",
    description: "Gentle remedies for immunity, behavioral patterns, and childhood allergies.",
    icon: "Baby",
    mediaType: "image",
    mediaUrl: "/Pediatric.jpeg"
  },
  {
    id: "womens-wellness",
    title: "Women's Wellness",
    description: "Holistic regulation for hormonal imbalances, PCOS, thyroid, and anxiety.",
    icon: "Venus",
    mediaType: "image",
    mediaUrl: "/Womenwellness.jpeg"
  },
  {
    id: "mental-health",
    title: "Mental Health",
    description: "Natural, supportive therapeutic options for chronic stress, depression, and insomnia.",
    icon: "Activity",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "dermatology",
    title: "Dermatology & Skin",
    description: "Root-level purification treatments for eczema, psoriasis, and allergies.",
    icon: "Sparkles",
    mediaType: "image",
    mediaUrl: "/Dermatology.jpeg"
  },
  {
    id: "autoimmune",
    title: "Autoimmune Support",
    description: "Immune modulation therapies to restore constitutional cellular balance.",
    icon: "ShieldAlert",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=400&q=80"
  }
];
