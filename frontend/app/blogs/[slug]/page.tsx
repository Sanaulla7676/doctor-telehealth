"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";
import { useParams } from "next/navigation";
import { getApiUrl } from "@/lib/utils";

type Blog = { title: string; excerpt: string; content: string; cover_image?: string; category?: string; author?: string; published_at?: string; reading_time?: number };

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!slug) return; fetch(getApiUrl(`/api/blogs/${encodeURIComponent(slug)}`)).then(r => r.json()).then(d => setBlog(d.blog || null)).catch(() => setBlog(null)).finally(() => setLoading(false)); }, [slug]);
  if (loading) return <main className="min-h-screen bg-luxBg px-6 pt-32"><div className="max-w-3xl mx-auto h-96 bg-white rounded-3xl animate-pulse"/></main>;
  if (!blog) return <main className="min-h-screen bg-luxBg flex items-center justify-center"><div className="text-center"><h1 className="font-serif text-4xl text-luxDark">Article not found</h1><Link href="/blogs" className="inline-flex mt-6 text-sm font-bold">Back to blogs</Link></div></main>;
  return <main className="min-h-screen bg-luxBg"><article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24"><Link href="/blogs" className="inline-flex items-center gap-2 text-xs font-bold text-luxMuted hover:text-luxDark"><ArrowLeft className="w-4 h-4"/> All articles</Link><div className="mt-10"><span className="text-xs uppercase tracking-[0.25em] text-luxAccent font-bold">{blog.category || "Health"}</span><h1 className="font-serif text-5xl md:text-6xl text-luxDark font-semibold mt-4">{blog.title}</h1><p className="text-lg text-luxMuted leading-8 mt-5">{blog.excerpt}</p><div className="flex gap-5 text-xs text-luxMuted mt-6"><span className="flex gap-1 items-center"><CalendarDays className="w-3.5 h-3.5"/>{blog.published_at ? new Date(blog.published_at).toLocaleDateString() : ""}</span><span className="flex gap-1 items-center"><Clock className="w-3.5 h-3.5"/>{blog.reading_time || 5} min read</span></div></div>{blog.cover_image && <img src={blog.cover_image} alt="" className="w-full aspect-[16/8] object-cover rounded-3xl mt-12"/>}<div className="mt-12 bg-white rounded-3xl border border-black/[0.05] p-7 md:p-12"><div className="prose prose-neutral max-w-none whitespace-pre-wrap text-sm leading-8 text-luxDark">{blog.content}</div></div></article></main>;
}
