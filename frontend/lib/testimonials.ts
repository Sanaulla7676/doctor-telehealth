import fs from 'fs';
import path from 'path';

export interface TestimonialDetails {
  id: string;
  featured: boolean;
  published: boolean;
  type?: "case-study" | "testimonial" | "mixed";
  title: string;
  patient: {
    name: string;
    age: number | null;
    gender: string | null;
  };
  condition: string[];
  duration?: string | null;
  status: string;
  doctor: string;
  summary: string;
  rating: number;
  hasBeforeAfter?: boolean;
  images?: {
    before?: string[];
    after?: string[];
  };
  feedback?: {
    title: string;
    textFile: string;
    image: string;
  } | null;
  treatmentHighlights?: string[];
  results?: string[];
  tags?: string[];
  seo?: {
    slug: string;
    metaTitle: string;
    metaDescription: string;
  };
}

export interface PatientTestimonial extends TestimonialDetails {
  slug: string;
  feedbackText: string | null;
  beforeImagesUrl: string[];
  afterImagesUrl: string[];
  feedbackImageUrl: string | null;
}

export function getAllTestimonials(): PatientTestimonial[] {
  const testimonialsDir = path.join(process.cwd(), 'public', 'testimonials');
  
  if (!fs.existsSync(testimonialsDir)) {
    console.warn(`Testimonials directory not found at: ${testimonialsDir}`);
    return [];
  }

  const folders = fs.readdirSync(testimonialsDir).filter((file) => {
    const filePath = path.join(testimonialsDir, file);
    return fs.statSync(filePath).isDirectory();
  });

  const list: PatientTestimonial[] = [];

  for (const folder of folders) {
    const folderPath = path.join(testimonialsDir, folder);
    const detailsPath = path.join(folderPath, 'details.json');

    if (!fs.existsSync(detailsPath)) {
      continue;
    }

    try {
      const detailsRaw = fs.readFileSync(detailsPath, 'utf8');
      const details: TestimonialDetails = JSON.parse(detailsRaw);

      // Determine slug
      const slug = details.seo?.slug || folder;

      // Check feedback.txt
      let feedbackText: string | null = null;
      const feedbackTxtPath = path.join(folderPath, 'feedback.txt');
      if (fs.existsSync(feedbackTxtPath)) {
        feedbackText = fs.readFileSync(feedbackTxtPath, 'utf8');
      }

      // Check before images URL
      const beforeImagesUrl: string[] = [];
      const beforeDir = path.join(folderPath, 'before');
      if (fs.existsSync(beforeDir)) {
        const files = fs.readdirSync(beforeDir);
        files.forEach(f => {
          if (/\.(png|jpe?g|svg|webp)$/i.test(f)) {
            beforeImagesUrl.push(`/testimonials/${folder}/before/${f}`);
          }
        });
      }

      // Check after images URL
      const afterImagesUrl: string[] = [];
      const afterDir = path.join(folderPath, 'after');
      if (fs.existsSync(afterDir)) {
        const files = fs.readdirSync(afterDir);
        files.forEach(f => {
          if (/\.(png|jpe?g|svg|webp)$/i.test(f)) {
            afterImagesUrl.push(`/testimonials/${folder}/after/${f}`);
          }
        });
      }

      // Check feedback image URL
      let feedbackImageUrl: string | null = null;
      const feedbackDir = path.join(folderPath, 'feedback');
      if (fs.existsSync(feedbackDir)) {
        const files = fs.readdirSync(feedbackDir);
        const imgFile = files.find(f => /\.(png|jpe?g|svg|webp)$/i.test(f) && !f.includes('avatar'));
        if (imgFile) {
          feedbackImageUrl = `/testimonials/${folder}/feedback/${imgFile}`;
        }
      }

      // Map dynamic type if missing
      const determinedType = details.type || 
        (beforeImagesUrl.length > 0 && feedbackText ? 'mixed' : 
         beforeImagesUrl.length > 0 ? 'case-study' : 'testimonial');

      list.push({
        ...details,
        type: determinedType,
        slug,
        feedbackText,
        beforeImagesUrl,
        afterImagesUrl,
        feedbackImageUrl
      });
    } catch (e) {
      console.error(`Error parsing testimonial in folder ${folder}:`, e);
    }
  }

  return list;
}

export function getTestimonialBySlug(slug: string): PatientTestimonial | null {
  const testimonials = getAllTestimonials();
  return testimonials.find(t => t.slug === slug || t.id === slug) || null;
}
