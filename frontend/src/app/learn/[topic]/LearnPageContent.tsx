"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  ChevronRight, BookOpen, FileCode, Palette, Code2, 
  Terminal, Layers, Database, Server, ChevronDown, 
  Search, CheckCircle2, Circle, Copy, RotateCcw, Play,
  Lightbulb, AlertTriangle, XCircle, CheckCircle, Zap,
  MonitorPlay, StickyNote, CornerDownRight,
  BrainCircuit,
  Sparkles,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLearnSidebarData } from "@/hooks/queries/useLearnSidebarData";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const fadeInLeft = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } };

const SAFE_URL_PROTOCOLS = new Set(["http:", "https:"]);
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"]);
const URL_CACHE_LIMIT = 500;
const safeAbsoluteUrlCache = new Map<string, string>();
const safeAssetUrlCache = new Map<string, string>();
const safeHrefCache = new Map<string, string>();
const youtubeEmbedUrlCache = new Map<string, string>();

const setCachedValue = (cache: Map<string, string>, key: string, value: string) => {
  if (cache.size >= URL_CACHE_LIMIT) cache.clear();
  cache.set(key, value);
  return value;
};

const toSafeAbsoluteHttpUrl = (url: unknown) => {
  if (typeof url !== "string") return "";
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return "";
  const cached = safeAbsoluteUrlCache.get(trimmedUrl);
  if (cached !== undefined) return cached;

  let safeUrl = "";
  try {
    const parsedUrl = new URL(trimmedUrl);
    if (SAFE_URL_PROTOCOLS.has(parsedUrl.protocol)) {
      safeUrl = parsedUrl.toString();
    }
  } catch {
    safeUrl = "";
  }

  return setCachedValue(safeAbsoluteUrlCache, trimmedUrl, safeUrl);
};

const toSafeAssetUrl = (url: unknown) => {
  if (typeof url !== "string") return "";
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return "";
  const cached = safeAssetUrlCache.get(trimmedUrl);
  if (cached !== undefined) return cached;

  const safeUrl = trimmedUrl.startsWith("/") ? trimmedUrl : toSafeAbsoluteHttpUrl(trimmedUrl);
  return setCachedValue(safeAssetUrlCache, trimmedUrl, safeUrl);
};

const toSafeHref = (href: unknown) => {
  if (typeof href !== "string") return "/";
  const trimmedHref = href.trim();
  if (!trimmedHref) return "/";
  const cached = safeHrefCache.get(trimmedHref);
  if (cached !== undefined) return cached;

  const safeHref = trimmedHref.startsWith("/") ? trimmedHref : (toSafeAbsoluteHttpUrl(trimmedHref) || "/");
  return setCachedValue(safeHrefCache, trimmedHref, safeHref);
};

// Converts supported YouTube URLs to trusted embed URLs
const getYouTubeEmbedUrl = (url: unknown) => {
  if (typeof url !== "string") return "";
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return "";

  const cached = youtubeEmbedUrlCache.get(trimmedUrl);
  if (cached !== undefined) return cached;

  const safeUrl = toSafeAbsoluteHttpUrl(trimmedUrl);
  if (!safeUrl) return setCachedValue(youtubeEmbedUrlCache, trimmedUrl, "");

  let safeEmbedUrl = "";
  try {
    const urlObj = new URL(safeUrl);
    const host = urlObj.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS.has(host)) {
      return setCachedValue(youtubeEmbedUrlCache, trimmedUrl, "");
    }

    let videoId = "";
    if (host === "youtu.be" || host === "www.youtu.be") {
      videoId = urlObj.pathname.split("/").filter(Boolean)[0] || "";
    } else if (urlObj.pathname.startsWith("/embed/")) {
      videoId = urlObj.pathname.replace("/embed/", "").split("/")[0] || "";
    } else {
      videoId = urlObj.searchParams.get("v") || "";
    }

    if (/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      safeEmbedUrl = `https://www.youtube.com/embed/${videoId}?rel=0`;
    }
  } catch {
    safeEmbedUrl = "";
  }

  return setCachedValue(youtubeEmbedUrlCache, trimmedUrl, safeEmbedUrl);
};

function InlineText({ parts }: any) {
  if (!Array.isArray(parts)) return <>{parts}</>;

  return parts.map((p: any, i: number) => {
    const className = cn(
      p.bold && "font-semibold",
      p.italic && "italic",
      p.highlight && "bg-yellow-200 dark:bg-yellow-500/30 px-1 rounded"
    );

    if (p.link) {
      return (
        <Link key={i} href={toSafeHref(p.link)} className={cn("underline text-primary", className)}>
          {p.value}
        </Link>
      );
    }

    return (
      <span key={i} className={className}>
        {p.value}
      </span>
    );
  });
}

function RenderBlocks({ blocks }: any) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  return (
    <div className="space-y-6">
      {blocks.map((b: any, i: number) => {
        switch (b.type) {
          case "heading":
            const Tag = `h${b.level || 2}` as any;
            return (
              <Tag key={i} className="font-bold text-2xl text-slate-900 dark:text-white">
                {b.text}
              </Tag>
            );

          case "paragraph":
            return (
              <p key={i} className="text-slate-600 dark:text-slate-400 leading-relaxed">
                <InlineText parts={b.text} />
              </p>
            );

          case "ul":
            return (
              <ul key={i} className="list-disc pl-6 space-y-1">
                {b.items?.map((it: string, idx: number) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            );

          case "ol":
            return (
              <ol key={i} className="list-decimal pl-6 space-y-1">
                {b.items?.map((it: string, idx: number) => (
                  <li key={idx}>{it}</li>
                ))}
              </ol>
            );

          case "table":
            return (
              <div key={i} className="overflow-auto border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      {b.headers?.map((h: string, idx: number) => (
                        <th key={idx} className="p-3 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows?.map((row: any[], r: number) => (
                      <tr key={r} className="border-t">
                        {row.map((c, cidx) => (
                          <td key={cidx} className="p-3">{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case "code":
            // Get the language to create a dynamic fake filename
            const lang = b.language || 'txt';
            const ext = lang === 'python' ? 'py' : lang === 'javascript' || lang === 'js' ? 'js' : lang === 'react' ? 'jsx' : lang;

            return (
              <div key={i} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#1e1e2e] text-sm md:text-base my-6 shadow-sm relative group">
                
                {/* Editor Header UI */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#2a2a3c] border-b border-black/20">
                   <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                   </div>
                   <span className="text-xs font-mono text-slate-400 absolute left-1/2 -translate-x-1/2">
                     example.{ext}
                   </span>
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-6 text-xs text-slate-400 hover:text-white hover:bg-white/10" 
                     onClick={() => navigator.clipboard.writeText(b.code)}
                   >
                      <Copy className="w-3 h-3 mr-1"/> Copy
                   </Button>
                </div>

                {/* Code Content */}
                <SyntaxHighlighter 
                  language={b.language} 
                  style={vscDarkPlus} 
                  customStyle={{ margin: 0, padding: '1.5rem', backgroundColor: '#1e1e2e' }}
                  wrapLines={true}
                  wrapLongLines={true}
                >
                  {b.code}
                </SyntaxHighlighter>
              </div>
            );
          case "callout":
            return (
              <div key={i} className="p-4 rounded-xl border bg-indigo-50 dark:bg-indigo-500/10">
                <div className="font-semibold mb-1">{b.title}</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">{b.text}</div>
              </div>
            );

          case "image": {
            const safeImageUrl = toSafeAssetUrl(b.url);
            if (!safeImageUrl) return null;

            return (
              <img
                key={i}
                src={safeImageUrl}
                alt={typeof b.alt === "string" ? b.alt : "Lesson image"}
                className="rounded-xl border"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            );
          }

          case "video": {
            const safeVideoUrl = getYouTubeEmbedUrl(b.url);
            if (!safeVideoUrl) return null;

            return (
              <iframe
                key={i}
                src={safeVideoUrl}
                className="w-full aspect-video rounded-xl"
                title={typeof b.title === "string" ? b.title : "Lesson video"}
                referrerPolicy="no-referrer"
                allowFullScreen
              />
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}

export default function LearnPageContent({ topic }: { topic: string }) {
  const urlTopic = topic.toLowerCase();
  
  const { data: topics, technology, isPending, isError } = useLearnSidebarData(urlTopic);

  const [activeTopicId, setActiveTopicId] = useState("");
  const [activeLessonId, setActiveLessonId] = useState("");
  const [expandedTopic, setExpandedTopic] = useState("");
  
  // Responsive Sidebar Logic
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size on mount
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (topics && topics.length > 0 && !activeTopicId) {
       setActiveTopicId(topics[0].id);
       setExpandedTopic(topics[0].id);
       if (topics[0].lessons?.length > 0) {
          setActiveLessonId(topics[0].lessons[0].id);
       }
    }
  }, [topics, activeTopicId]);

  const currentTopic = useMemo(() => (topics || []).find((t: any) => t.id === activeTopicId) || (topics || [])[0], [topics, activeTopicId]);
  const currentLesson = useMemo(() => currentTopic?.lessons?.find((l: any) => l.id === activeLessonId) || currentTopic?.lessons?.[0], [currentTopic, activeLessonId]);
  
  const [code, setCode] = useState("");
  useEffect(() => { if (currentLesson) setCode(currentLesson.code); }, [currentLesson]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50 dark:bg-[#0B0C10]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError || !topics || topics.length === 0 || !currentTopic || !currentLesson) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50 dark:bg-[#0B0C10] text-slate-500">
        No content available for {topic}.
      </div>
    );
  }

  const progress = 33; 

  const navigateLesson = (direction: 'next' | 'prev') => {
    const currentIndex = currentTopic.lessons.findIndex(l => l.id === activeLessonId);
    if (direction === 'next' && currentIndex < currentTopic.lessons.length - 1) {
      setActiveLessonId(currentTopic.lessons[currentIndex + 1].id);
    } else if (direction === 'prev' && currentIndex > 0) {
      setActiveLessonId(currentTopic.lessons[currentIndex - 1].id);
    }
  };

  const currentLessonImageUrl = toSafeAssetUrl(currentLesson.imageUrl);
  const currentLessonVideoUrl = getYouTubeEmbedUrl(currentLesson.videoUrl);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-[#0B0C10]">
      <div className="flex flex-1 ">
        
        {/* --- MOBILE OVERLAY (Closes sidebar when clicked) --- */}
        <AnimatePresence>
          {isMobile && sidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* --- SIDEBAR --- */}
        <motion.aside 
          className={cn(
            "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-[#111217] border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 z-50 lg:z-40 overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)]", 
            "w-80", // Fixed width
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-r-0" // Slide out on mobile, collapse on desktop
          )}
        >
          <div className="h-full flex flex-col w-80">
            {/* Search */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
              <div className="relative group flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Filter topics..." 
                  className="pl-9 bg-slate-100 dark:bg-slate-900/50 border-transparent focus:bg-white dark:focus:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all shadow-none" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {/* Mobile Close Button */}
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="lg:hidden ml-2">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Progress */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Course Progress</span>
                <Badge variant="secondary" className="text-xs font-bold text-primary bg-primary/10 border-primary/20">{progress}%</Badge>
              </div>
              <Progress value={progress} className="h-1.5 bg-slate-200 dark:bg-slate-800" indicatorClassName="bg-gradient-to-r from-indigo-500 to-purple-500" />
            </div>

            {/* Topics List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              {topics.map((topic) => (
                <div key={topic.id} className="mb-2">
                  <button 
                    onClick={() => setExpandedTopic(expandedTopic === topic.id ? "" : topic.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 group border border-transparent", 
                      activeTopicId === topic.id 
                        ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm shadow-slate-200/50 dark:shadow-none" 
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-110 shadow-sm", topic.bgColor)}>
                      <topic.icon className={cn("w-4 h-4", topic.color)} />
                    </div>
                    <span className="font-semibold text-sm flex-1 text-slate-700 dark:text-slate-200">{topic.name}</span>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-300", expandedTopic === topic.id && "rotate-180")} />
                  </button>
                  
                  <AnimatePresence>
                    {expandedTopic === topic.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-5 pl-4 border-l-2 border-slate-200 dark:border-slate-800 my-2 space-y-0.5">
                          {topic.lessons.map((lesson: any) => (
                            <div key={lesson.id} className="mb-1">
                              <button
                                onClick={() => { 
                                  setActiveTopicId(topic.id); 
                                  setActiveLessonId(lesson.id);
                                  if(isMobile && (!lesson.subtopics || lesson.subtopics.length === 0)) setSidebarOpen(false);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between gap-2.5 py-2 px-3 text-sm rounded-lg transition-all text-left relative overflow-hidden", 
                                  activeLessonId === lesson.id 
                                    ? "bg-primary/10 text-primary font-medium" 
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                                )}
                              >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  {activeLessonId === lesson.id ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0 opacity-40" />}
                                  <span className="line-clamp-1">{lesson.title}</span>
                                </div>
                                {lesson.subtopics && lesson.subtopics.length > 0 && (
                                  <ChevronDown className={cn("w-3.5 h-3.5 opacity-50 transition-transform", activeLessonId === lesson.id && "rotate-180")} />
                                )}
                              </button>
                              
                              {/* Subtopics nested list */}
                              <AnimatePresence>
                                {activeLessonId === lesson.id && lesson.subtopics && lesson.subtopics.length > 0 && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="ml-4 pl-3.5 border-l-2 border-slate-100 dark:border-slate-800/80 my-1 space-y-0.5">
                                      {lesson.subtopics.map((sub: any, idx: number) => (
                                        <button
                                          key={sub.id}
                                          onClick={() => {
                                             if(isMobile) setSidebarOpen(false);
                                             const el = document.getElementById(`subtopic-${sub.id}`);
                                             if (el) {
                                                const y = el.getBoundingClientRect().top + window.scrollY - 100;
                                                window.scrollTo({ top: y, behavior: 'smooth' });
                                             }
                                          }}
                                          className="w-full flex items-center gap-2 py-1.5 px-3 text-[13px] rounded-md transition-all text-left text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                                          >
                                          <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                                          <span className="line-clamp-1">{sub.title}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </motion.aside>

        {/* --- MAIN CONTENT --- */}
        <main 
          className={cn(
            "flex-1 transition-all duration-300 min-w-0 bg-slate-50/50 dark:bg-[#0B0C10] relative flex flex-col", 
            sidebarOpen && !isMobile ? "lg:ml-80" : "ml-0" // Only add margin on desktop
          )}
        >
          

          {/* STICKY HEADER */}
          <div className="sticky top-0 z-30 w-full bg-slate-50/95 dark:bg-[#0B0C10]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3 flex items-center gap-4 shadow-sm">
             <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="shrink-0 hover:bg-white dark:hover:bg-slate-800">
                {sidebarOpen ? <ChevronRight className="w-5 h-5 text-slate-500 rotate-180" /> : <Menu className="w-5 h-5 text-slate-500" />}
             </Button>
             <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
             <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 overflow-hidden whitespace-nowrap mask-linear-fade">
                <span className="font-semibold text-primary hidden md:inline">{technology?.name || currentTopic.name}</span>
                <ChevronRight className="w-4 h-4 text-slate-300 hidden md:inline" />
                <span className="text-slate-900 dark:text-white font-medium truncate">{currentLesson.title}</span>
             </nav>
          </div>

          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 md:py-12 space-y-10 md:space-y-16 relative z-10 flex-1">
            
            {/* 1. IMAGE BANNER */}
            {currentLessonImageUrl && (
              <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="rounded-xl overflow-hidden mb-8 md:mb-12 border border-slate-200 dark:border-slate-800">
                <img 
                  src={currentLessonImageUrl}
                  alt={currentLesson.title} 
                  className="w-full h-auto object-cover max-h-[500px]"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            )}

            {/* 2. TITLE & DESCRIPTION */}
            <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-6">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  {currentLesson.title}
                </h1>
                <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-none">
                  {currentLesson.description}
                </p>
              </div>
            </motion.div>
            
            <div className="flex flex-col gap-8">
              {currentLesson.whatItSolves?.length > 0 && (
                <div className="border-l-4 border-orange-500 pl-5 py-2">
                  <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-100 font-semibold text-sm uppercase tracking-widest">
                    <AlertTriangle className="w-4 h-4 text-orange-500" /> The Problem
                  </div>
                  <ul className="space-y-3">
{currentLesson.whatItSolves.map((prob: any, i: number) => (                      <li key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                        <RenderBlocks blocks={[prob]} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {currentLesson.conceptualUnderstanding?.length > 0 && (
                <div className="border-l-4 border-indigo-500 pl-5 py-2">
                  <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-100 font-semibold text-sm uppercase tracking-widest">
                    <BrainCircuit className="w-4 h-4 text-indigo-500" /> Mental Model
                  </div>
                  <ul className="space-y-3">
                    {currentLesson.conceptualUnderstanding.map((model: any, i: number) => (
                      <li key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                        <RenderBlocks blocks={[model]} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <RenderBlocks blocks={currentLesson.content} />

            {/* 5. VIDEO */}
            {currentLessonVideoUrl && (
              <motion.div variants={fadeInUp} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black aspect-video relative">
                <iframe 
                  src={currentLessonVideoUrl}
                  className="w-full h-full" 
                  title="Lesson Video" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  referrerPolicy="no-referrer"
                  allowFullScreen 
                />
              </motion.div>
            )}

            {/* 6. EXAMPLES / SYNTAX & CODE PLAYGROUND */}
            <motion.div variants={fadeInUp} className="space-y-4">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Terminal className="w-5 h-5 text-primary" /> Interactive Playground
                  </h3>
                  <Badge variant="secondary" className="font-mono text-xs w-fit">
                    syntax: {currentLesson.syntax}
                  </Badge>
               </div>
               
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#1e1e2e]">
                  {/* Editor */}
                  <div className="flex flex-col h-[350px] md:h-[500px] border-b xl:border-b-0 xl:border-r border-white/5 relative group">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#2a2a3c] border-b border-black/20">
                       <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500/50" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                          <div className="w-3 h-3 rounded-full bg-green-500/50" />
                       </div>
                       <span className="text-xs font-mono text-slate-400 absolute left-1/2 -translate-x-1/2">index.html</span>
                       <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400 hover:text-white hover:bg-white/10" onClick={() => navigator.clipboard.writeText(code)}>
                          <Copy className="w-3 h-3 mr-1"/> Copy
                       </Button>
                    </div>
                    <div className="flex-1 overflow-auto bg-[#1e1e2e]">
                      <Editor
                        value={code}
                        onValueChange={code => setCode(code)}
                        highlight={code => {
                           const lang = urlTopic === 'python' ? Prism.languages.python 
                                      : urlTopic === 'javascript' || urlTopic === 'js' ? Prism.languages.javascript 
                                      : urlTopic === 'css' ? Prism.languages.css 
                                      : Prism.languages.html;
                           const langStr = urlTopic === 'python' ? 'python' 
                                      : urlTopic === 'javascript' || urlTopic === 'js' ? 'javascript' 
                                      : urlTopic === 'css' ? 'css' 
                                      : 'html';
                           return Prism.highlight(code, lang, langStr);
                        }}
                        padding={24}
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                          fontSize: 14,
                          minHeight: '100%',
                        }}
                        className="w-full text-slate-300 focus:outline-none leading-relaxed selection:bg-indigo-500/30"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="flex flex-col h-[350px] md:h-[500px] bg-white border-l border-slate-200 dark:border-transparent">
                    <div className="flex items-center px-4 py-2 bg-slate-50 border-b border-slate-200">
                       <MonitorPlay className="w-3 h-3 text-slate-400 mr-2" />
                       <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Preview</span>
                    </div>
                    <iframe
                      srcDoc={typeof code === "string" ? code : ""}
                      className="flex-1 w-full border-none"
                      title="output"
                      sandbox=""
                      referrerPolicy="no-referrer"
                    />
                  </div>
               </div>
            </motion.div>

            {/* 11. SUBTOPICS */}
            <div className="space-y-16 mt-16 pt-8 border-t border-slate-200 dark:border-slate-800">
               {currentLesson.subtopics?.map((sub: any, idx: number) => (
                 <motion.div key={idx} id={`subtopic-${sub.id}`} variants={fadeInUp} className="space-y-8">

                    {/* 1. TITLE & DESCRIPTION */}
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">{sub.title}</h2>
                      <div className="text-base md:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-none">
                        <RenderBlocks blocks={[{ type: 'paragraph', text: [{ value: sub.content }] }]} />
                      </div>
                    </div>

                    {/* 2. IMAGE BANNER */}
                    {toSafeAssetUrl(sub.imageUrl) && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        <img 
                          src={toSafeAssetUrl(sub.imageUrl)}
                          alt={sub.title} 
                          className="w-full h-auto object-cover max-h-[400px]"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* 3 & 4. PROBLEMS & MENTAL MODELS */}
                    {(sub.problems?.length > 0 || sub.mentalModel?.length > 0) && (
                      <div className="flex flex-col gap-8 my-8">
                        {sub.problems?.length > 0 && (
                          <div className="border-l-4 border-orange-500 pl-5 py-2">
                            <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-100 font-semibold text-sm uppercase tracking-widest">
                              <AlertTriangle className="w-4 h-4 text-orange-500" /> The Problem
                            </div>
                            <ul className="space-y-3">
                              {sub.problems.map((prob: any, i: number) => (
                                <li key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                                  <RenderBlocks blocks={[prob]} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {sub.mentalModel?.length > 0 && (
                          <div className="border-l-4 border-indigo-500 pl-5 py-2">
                            <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-100 font-semibold text-sm uppercase tracking-widest">
                              <BrainCircuit className="w-4 h-4 text-indigo-500" /> Mental Model
                            </div>
                            <ul className="space-y-3">
                              {sub.mentalModel.map((model: any, i: number) => (
                                <li key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                                  <RenderBlocks blocks={[model]} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 5. VIDEO */}
                    {getYouTubeEmbedUrl(sub.videoUrl) && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black aspect-video relative my-8">
                        <iframe 
                          src={getYouTubeEmbedUrl(sub.videoUrl)}
                          className="w-full h-full" 
                          title={`${sub.title} Video`} 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          referrerPolicy="no-referrer"
                          allowFullScreen 
                        />
                      </div>
                    )}

                    {/* 6. EXAMPLES (CODE) */}
                    {/* {sub.example && (
                      <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#000000] text-sm md:text-base my-8">
                        <SyntaxHighlighter
                          language={urlTopic}
                          style={vscDarkPlus}
                          customStyle={{ margin: 0, padding: '1.5rem', backgroundColor: '#000000' }}
                          wrapLines={true}
                          wrapLongLines={true}
                        >
                          {sub.example}
                        </SyntaxHighlighter>
                      </div>
                    )} */}

                    {/* 6. EXAMPLES (CODE) */}
                    {sub.example && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#1e1e2e] text-sm md:text-base my-8 shadow-sm relative group">
                        
                        {/* Editor Header UI */}
                        <div className="flex items-center justify-between px-4 py-2 bg-[#2a2a3c] border-b border-black/20">
                           <div className="flex gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-red-500/50" />
                              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                              <div className="w-3 h-3 rounded-full bg-green-500/50" />
                           </div>
                           <span className="text-xs font-mono text-slate-400 absolute left-1/2 -translate-x-1/2">
                             example.{urlTopic === 'python' ? 'py' : urlTopic === 'javascript' || urlTopic === 'js' ? 'js' : urlTopic === 'react' ? 'jsx' : urlTopic}
                           </span>
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="h-6 text-xs text-slate-400 hover:text-white hover:bg-white/10" 
                             onClick={() => navigator.clipboard.writeText(sub.example)}
                           >
                              <Copy className="w-3 h-3 mr-1"/> Copy
                           </Button>
                        </div>

                        {/* Code Content */}
                        <SyntaxHighlighter
                          language={urlTopic}
                          style={vscDarkPlus}
                          customStyle={{ margin: 0, padding: '1.5rem', backgroundColor: '#1e1e2e' }}
                          wrapLines={true}
                          wrapLongLines={true}
                        >
                          {sub.example}
                        </SyntaxHighlighter>
                      </div>
                    )}

                    {/* 7. COMMON MISTAKES */}
                    {sub.commonMistakes?.length > 0 && (
                      <div className="border-l-4 border-rose-500 pl-5 py-2 my-8">
                        <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-100 font-semibold text-sm uppercase tracking-widest">
                          <XCircle className="w-4 h-4 text-rose-500" /> Common Mistakes
                        </div>
                        <ul className="space-y-3">
                          {sub.commonMistakes.map((mistake: any, i: number) => (
                            <li key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                               <RenderBlocks blocks={[mistake]} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 8 & 9. WHEN TO USE / NOT TO USE */}
                    {(sub.whenToUse?.length > 0 || sub.whenNotToUse?.length > 0) && (
                      <div className="flex flex-col md:flex-row gap-8 my-8">
                        {sub.whenToUse?.length > 0 && (
                          <div className="flex-1">
                            <h4 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white mb-4">
                              <CheckCircle className="w-5 h-5 text-emerald-500" /> When to use
                            </h4>
                            <ul className="space-y-3">
                              {sub.whenToUse.map((item: any, i: number) => (
                                <li key={i} className="flex gap-3 text-slate-600 dark:text-slate-400 text-sm md:text-base">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                                  <div className="flex-1"><RenderBlocks blocks={[item]} /></div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {sub.whenNotToUse?.length > 0 && (
                          <div className="flex-1">
                            <h4 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white mb-4">
                              <XCircle className="w-5 h-5 text-rose-500" /> When NOT to use
                            </h4>
                            <ul className="space-y-3">
                              {sub.whenNotToUse.map((item: any, i: number) => (
                                <li key={i} className="flex gap-3 text-slate-600 dark:text-slate-400 text-sm md:text-base">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                                  <div className="flex-1"><RenderBlocks blocks={[item]} /></div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 10. BONUS TIPS */}
                    {sub.tip?.length > 0 && (
                      <div className="border-l-4 border-blue-500 pl-5 py-2 my-8">
                         <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-100 font-semibold text-sm uppercase tracking-widest">
                           <Zap className="w-4 h-4 text-blue-500" /> Pro Tips
                         </div>
                         <ul className="space-y-3">
                           {sub.tip.map((t: any, i: number) => (
                             <li key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                               <RenderBlocks blocks={[t]} />
                             </li>
                           ))}
                         </ul>
                      </div>
                    )}
                 </motion.div>
               ))}
            </div>

            {/* MAIN LESSON SHARED BLOCKS */}
            
            {/* 7. COMMON MISTAKES */}
            {currentLesson.commonMistakes?.length > 0 && (
              <motion.div variants={fadeInUp} className="border-l-4 border-rose-500 pl-5 py-2 mt-8">
                <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-100 font-semibold text-sm uppercase tracking-widest">
                  <XCircle className="w-4 h-4 text-rose-500" /> Common Mistakes
                </div>
                <ul className="space-y-3">
                  {currentLesson.commonMistakes.map((mistake: any, i: number) => (
                    <li key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                      <RenderBlocks blocks={[mistake]} />
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* 8 & 9. USE CASES - Full width */}
            {(currentLesson.whenToUse?.length > 0 || currentLesson.whenNotToUse?.length > 0) && (
              <motion.div variants={fadeInUp} className="flex flex-col md:flex-row gap-8 mt-8">
                {currentLesson.whenToUse?.length > 0 && (
                  <div className="flex-1">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white mb-4">
                      <CheckCircle className="w-5 h-5 text-emerald-500" /> When to use
                    </h3>
                    <ul className="space-y-3">
                      {currentLesson.whenToUse.map((item: any, i: number) => (
                        <li key={i} className="flex gap-3 text-slate-600 dark:text-slate-400 text-sm md:text-base">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                          <div className="flex-1"><RenderBlocks blocks={[item]} /></div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {currentLesson.whenNotToUse?.length > 0 && (
                  <div className="flex-1">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white mb-4">
                      <XCircle className="w-5 h-5 text-rose-500" /> When NOT to use
                    </h3>
                    <ul className="space-y-3">
                      {currentLesson.whenNotToUse.map((item: any, i: number) => (
                        <li key={i} className="flex gap-3 text-slate-600 dark:text-slate-400 text-sm md:text-base">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                          <div className="flex-1"><RenderBlocks blocks={[item]} /></div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}

            {/* 10. BONUS TIPS */}
            {currentLesson.bonusTip?.length > 0 && (
              <motion.div variants={fadeInUp} className="border-l-4 border-blue-500 pl-5 py-2 mt-8">
                <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-100 font-semibold text-sm uppercase tracking-widest">
                  <Zap className="w-4 h-4 text-blue-500" /> Pro Tips
                </div>
                <ul className="space-y-3">
                  {currentLesson.bonusTip.map((t: any, i: number) => (
                    <li key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                      <RenderBlocks blocks={[t]} />
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* NAVIGATOR FOOTER */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-12 border-t border-slate-200 dark:border-slate-800">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => navigateLesson('prev')} 
                  disabled={currentTopic.lessons.findIndex(l => l.id === activeLessonId) === 0}
                  className="group w-full md:w-auto"
                >
                  <ChevronRight className="w-4 h-4 mr-2 rotate-180 group-hover:-translate-x-1 transition-transform text-slate-400 group-hover:text-foreground" /> 
                  <span className="text-slate-600 dark:text-slate-300 group-hover:text-foreground">Previous Lesson</span>
                </Button>
                <Button 
                  variant="hero" 
                  size="lg"
                  onClick={() => navigateLesson('next')} 
                  disabled={currentTopic.lessons.findIndex(l => l.id === activeLessonId) === currentTopic.lessons.length - 1}
                  className="group shadow-xl shadow-primary/20 w-full md:w-auto"
                >
                  Next Lesson <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
