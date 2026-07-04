import type { Metadata } from "next";
import { cormorantGaramond, plusJakartaSans } from "@/lib/fonts";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FloatingBookButton from "@/components/layout/FloatingBookButton";
import LenisProvider from "@/components/layout/LenisProvider";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Dr. Varsha Bandi - Holistic Healing. Vital Force Activation.",
  description: "Classical Homeopathy by Dr. Varsha Bandi. Deep constitutional therapy for chronic illnesses, pediatric care, hormonal balance and women's health.",
  metadataBase: new URL("https://doctor-telehealth.onrender.com"),
  openGraph: {
    title: "Dr. Varsha Bandi - Holistic Healing. Vital Force Activation.",
    description: "Classical Homeopathy by Dr. Varsha Bandi. Deep constitutional therapy for chronic illnesses, pediatric care, hormonal balance and women's health.",
    url: "/",
    siteName: "Homeopathway",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${cormorantGaramond.variable} scroll-smooth`}
    >
      <body className="flex flex-col min-h-screen antialiased bg-luxBg text-luxDark">
        <LenisProvider>
          <Navbar />
          <main className="flex-grow relative">
            {/* Background blurs */}
            <div className="absolute top-[50vh] left-1/4 w-[30rem] h-[30rem] bg-emerald-900/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            <div className="absolute top-[150vh] right-10 w-[20rem] h-[20rem] bg-green-900/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            {children}
          </main>
          <Footer />
          <FloatingBookButton />
        </LenisProvider>
      </body>
    </html>
  );
}
