"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, LogOut, User, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isLoggedIn, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setIsOpen(false);
    if (pathname !== "/") { window.location.href = `/#${id}`; return; }
    const element = document.getElementById(id);
    if (element) window.scrollTo({ top: element.getBoundingClientRect().top + window.pageYOffset - 80, behavior: "smooth" });
  };

  const navItems = [
    { label: "Home", action: () => scrollToSection("home") },
    { label: "Philosophy", action: () => scrollToSection("about") },
    { label: "Our Specialist", action: () => scrollToSection("doctor") },
    { label: "Treatments", action: () => scrollToSection("services") },
    { label: "Methodology", action: () => scrollToSection("products") },
    { label: "Testimonials", action: () => scrollToSection("testimonials") },
  ];

  return (
    <header className={cn("sticky top-0 z-50 w-full transition-all duration-300", isScrolled ? "backdrop-blur-xl bg-white/85 shadow-sm border-b border-black/[0.05] py-3" : "bg-transparent py-5")}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white border border-black/[0.06] flex items-center justify-center shadow-sm overflow-hidden"><img src="/logo.png" alt="Dr. Varsha Bandi Logo" className="w-full h-full object-cover" /></div>
            <div><span className="block text-xs font-extrabold tracking-tight text-luxDark uppercase">Dr. Varsha Bandi</span><span className="block text-[11px] font-medium text-luxAccent font-serif italic leading-none">Homoeopathway</span></div>
          </Link>
          <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold tracking-wider uppercase">
            {navItems.map((item) => <button key={item.label} onClick={item.action} className="text-luxMuted hover:text-luxDark transition">{item.label}</button>)}
            <Link href="/blogs" className="text-luxMuted hover:text-luxDark transition flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Blogs</Link>
            <button onClick={() => scrollToSection("contact")} className="text-white bg-luxDark hover:bg-luxAccent font-bold px-5 py-2.5 rounded-full transition shadow-sm">Book Consultation</button>
          </nav>
          <div className="hidden lg:flex items-center gap-4 text-xs font-semibold uppercase tracking-wider">
            {isLoggedIn ? <div className="flex items-center gap-4"><Link href="/portal" className="bg-luxDark text-white px-5 py-2.5 rounded-full flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Portal</Link><button onClick={logout} className="text-luxMuted hover:text-luxDark flex items-center gap-1"><LogOut className="w-3.5 h-3.5" /> Sign Out</button></div> : <div className="flex items-center gap-4"><Link href="/auth?tab=login" className="text-luxMuted">Login</Link><Link href="/auth?tab=register" className="bg-luxDark text-white px-5 py-2.5 rounded-full">Register</Link></div>}
          </div>
          <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden text-luxMuted">{isOpen ? <X /> : <Menu />}</button>
        </div>
      </div>
      {isOpen && <div className="lg:hidden bg-white border-t border-black/[0.05] px-6 py-6 space-y-3">
        {navItems.map((item) => <button key={item.label} onClick={item.action} className="block w-full text-left py-2 text-luxMuted font-semibold">{item.label}</button>)}
        <Link href="/blogs" onClick={() => setIsOpen(false)} className="flex items-center gap-2 py-2 text-luxMuted font-semibold"><BookOpen className="w-4 h-4" /> Blogs</Link>
        <button onClick={() => scrollToSection("contact")} className="w-full text-left py-2 text-luxAccent font-bold">Book Consultation</button>
        <div className="pt-4 border-t border-black/[0.05] mt-3 grid grid-cols-2 gap-3"><Link href="/auth?tab=login" onClick={() => setIsOpen(false)} className="text-center py-2.5 border rounded-xl font-bold">Login</Link><Link href="/auth?tab=register" onClick={() => setIsOpen(false)} className="text-center py-2.5 bg-luxDark text-white rounded-xl font-bold">Register</Link></div>
      </div>}
    </header>
  );
}
