import HeroSection from "@/components/sections/HeroSection";
import MarqueeSection from "@/components/sections/MarqueeSection";
import PhilosophySection from "@/components/sections/PhilosophySection";
import DoctorSection from "@/components/sections/DoctorSection";
import ServicesSection from "@/components/sections/ServicesSection";
import PharmacSection from "@/components/sections/PharmacSection";
import GallerySection from "@/components/sections/GallerySection";
import TestimonialsPreview from "@/components/sections/TestimonialsPreview";
import BookingSection from "@/components/sections/BookingSection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <MarqueeSection />
      <PhilosophySection />
      <DoctorSection />
      <ServicesSection />
      <PharmacSection />
      <GallerySection />
      <TestimonialsPreview />
      <BookingSection />
    </>
  );
}


