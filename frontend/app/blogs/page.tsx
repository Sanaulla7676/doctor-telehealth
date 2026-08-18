"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Clock } from "lucide-react";
import { getApiUrl } from "@/lib/utils";

type Blog = { id: string; title: string; slug: string; excerpt: string; content: string; cover_image?: string; category?: string; author?: string; published_at?: string; reading_time?: number };

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(getApiUrl("/api/blogs")).then(r => r.json()).then(d => setBlogs(d.blogs || [])).catch(() => setBlogs([])).finally(() => setLoading(false)); }, []);
  return <main className="min-h-screen bg-luxBg">
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
      <div className="max-w-3xl"><span className="text-xs uppercase tracking-[0.25em] font-bold text-luxAccent">Clinical Journal</span><h1 className="font-serif text-5xl md:text-7xl font-semibold text-luxDark mt-4">Insights for better health.</h1><p className="mt-6 text-sm md:text-base leading-7 text-luxMuted max-w-2xl">Thoughtful articles from Dr. Varsha Bandi on homoeopathy, wellness, nutrition and patient education.</p></div>
    </section>
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      {loading ? <div className="grid md:grid-cols-3 gap-6">{[1,2,3].map(i => <div key={i} className="h-80 rounded-3xl bg-white animate-pulse border border-black/[0.04]" />)}</div> : blogs.length === 0 ? <div className="bg-white rounded-3xl border border-black/[0.05] p-12 text-center"><BookOpen className="w-8 h-8 mx-auto text-luxAccent"/><h2 className="font-serif text-3xl mt-4 text-luxDark">No articles published yet</h2><p className="text-sm text-luxMuted mt-2">New clinical articles will appear here as the doctor publishes them.</p></div> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">{blogs.map(blog => <article key={blog.id} className="group bg-white rounded-3xl overflow-hidden border border-black/[0.05] shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">{blog.cover_image ? <img src={blog.cover_image} alt="" className="w-full aspect-[16/10] object-cover"/> : <div className="aspect-[16/10] bg-luxDark flex items-end p-6"><BookOpen className="w-9 h-9 text-white/80"/></div>}<div className="p-7"><div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-luxMuted"><span>{blog.category || "Health"}</span><span>•</span><span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{blog.reading_time || 5} min</span></div><h2 className="font-serif text-2xl font-semibold text-luxDark mt-3 group-hover:text-luxAccent transition">{blog.title}</h2><p className="text-xs leading-6 text-luxMuted mt-3">{blog.excerpt}</p><div className="flex items-center justify-between mt-6"><span className="text-[10px] text-luxMuted flex items-center gap-1"><CalendarDays className="w-3 h-3"/>{blog.published_at ? new Date(blog.published_at).toLocaleDateString() : ""}</span><Link href={`/blogs/${blog.slug}`} className="text-xs font-bold text-luxDark flex items-center gap-1">Read <ArrowRight className="w-3.5 h-3.5"/></Link></div></div></article>)}</div>}
    </section>
  </main>;
}
