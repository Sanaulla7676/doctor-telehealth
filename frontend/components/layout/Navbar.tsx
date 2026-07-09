"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sprout, Menu, X, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isLoggedIn, name, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setIsOpen(false);
    if (pathname !== "/") {
      window.location.href = `/#${id}`;
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
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
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300 w-full font-sans",
        isScrolled
          ? "backdrop-blur-md bg-white/70 shadow-sm border-b border-black/[0.04] py-3"
          : "bg-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-white border border-black/[0.06] flex items-center justify-center shadow-sm overflow-hidden">
              <img src="/logo.png" alt="Dr. Varsha Bandi Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="block text-xs font-extrabold tracking-tight text-luxDark uppercase">
                Dr. Varsha Bandi
              </span>
              <span className="block text-[11px] font-medium text-luxAccent font-serif italic lowercase leading-none">
                homeopathway
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-6 text-xs font-semibold tracking-wider uppercase">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="hover:text-luxDark text-luxMuted transition py-2 px-1 hover:scale-105"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => scrollToSection("contact")}
              className="hover:text-luxDark text-luxAccent font-bold transition py-2 px-1 hover:scale-105"
            >
              Book Consultation
            </button>
          </nav>

          {/* Desktop Auth Links */}
          <div className="hidden lg:flex items-center space-x-4 text-xs font-semibold uppercase tracking-wider">
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/portal"
                  className="bg-luxDark hover:bg-luxAccent text-white px-5 py-2.5 rounded-full transition duration-200 shadow-sm flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Portal</span>
                </Link>
                <button
                  onClick={logout}
                  className="text-luxMuted hover:text-luxDark transition flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/auth?tab=login"
                  className="text-luxMuted hover:text-luxDark transition py-2 px-1"
                >
                  Login
                </Link>
                <Link
                  href="/auth?tab=register"
                  className="bg-luxDark hover:bg-luxAccent text-white px-5 py-2.5 rounded-full transition duration-200 shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Icon */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-luxMuted hover:text-luxDark focus:outline-none cursor-pointer"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Expandable Menu */}
      {isOpen && (
        <div className="lg:hidden bg-white border-t border-black/[0.05] px-6 py-6 space-y-3 font-sans transition-all duration-300">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="block w-full text-left py-2 text-luxMuted hover:text-luxDark font-semibold text-sm"
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => scrollToSection("contact")}
            className="block w-full text-left py-2 text-luxAccent hover:text-luxDark font-bold text-sm"
          >
            Book Consultation
          </button>
          
          <div className="pt-4 border-t border-black/[0.05] mt-3">
            {isLoggedIn ? (
              <div className="space-y-2">
                <Link
                  href="/portal"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center py-2.5 bg-luxAccent hover:bg-luxDark text-white rounded-xl font-bold text-sm"
                >
                  Patient Portal
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="block w-full text-center py-2.5 border border-black/[0.08] text-red-600 rounded-xl font-bold text-sm cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/auth?tab=login"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center py-2.5 border border-black/[0.08] rounded-xl text-luxDark font-bold text-sm"
                >
                  Login
                </Link>
                <Link
                  href="/auth?tab=register"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center py-2.5 bg-luxDark text-white rounded-xl font-bold text-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
