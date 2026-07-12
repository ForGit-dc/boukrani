import { useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { Github, Linkedin, FileText, Send, ExternalLink, Copy, ThumbsUp, ThumbsDown, ChevronLeft, ChevronUp, ChevronDown, Info, Menu, User, X, Edit3, Globe } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { suggestedQA } from "@/data/knowledge";
import { getConfig, saveConfig, getPortraitUrl, getPortraitAlt, getShowPowered, getHeroUrl, getHeroAlt } from "@/config";
import { ChatInput } from "./ChatInput";
import { IdentityModal } from "@/components/IdentityModal";
import { detectLang, languageCodes, languageNames, hasMixedLanguages, type SupportedLanguage } from "@/lib/language-utils";
import { useI18n } from "@/contexts/I18nContext";
import { LeftPanel } from "@/components/LeftPanel";
interface Evidence {
  title: string;
  url?: string;
}
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  streaming?: boolean;
  evidence?: Evidence[];
  canExpand?: {
    userText: string;
  };
}

// Generate client-side alias (must match server-side algorithm)
function makeGuestAlias(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    const char = sessionId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const base36 = Math.abs(hash).toString(36).toUpperCase();
  return `Guest-${base36.slice(0, 4).padStart(4, '0')}`;
}

interface VisitorIdentity {
  name?: string;
  alias: string;
}

export default function Chat() {
  // I18n hook
  const { lang, setLang, t, profileName } = useI18n();
  
  // Session ref - declare early to avoid initialization order issues
  const sessionIdRef = useRef<string>("");
  
  // New visitor identity state
  const [visitorIdentity, setVisitorIdentity] = useState<VisitorIdentity | null>(null);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  
  // Load visitor identity from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("visitor_identity");
    if (stored) {
      try {
        const identity = JSON.parse(stored) as VisitorIdentity;
        setVisitorIdentity(identity);
      } catch {
        // If parsing fails, clear invalid data
        localStorage.removeItem("visitor_identity");
      }
    } else {
      // Show identity modal on first load if no identity exists
      const timer = setTimeout(() => setShowIdentityModal(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Generate alias for debugging/display when no identity is set
  const debugAlias = useMemo(() => {
    if (sessionIdRef.current) {
      return makeGuestAlias(sessionIdRef.current);
    }
    return "Guest-0000";
  }, [sessionIdRef.current]);
  
  // Personalized welcome message
  const welcomeLine = useMemo(() => {
    const greeting = t('greeting');
    if (visitorIdentity?.name) {
      return greeting.replace("Hi, I'm Mohamed", `Hello ${visitorIdentity.name}, I'm Mohamed`)
                     .replace("Bonjour, je suis Mohamed", `Bonjour ${visitorIdentity.name}, je suis Mohamed`)
                     .replace("مرحباً - أنا محمد", `مرحباً ${visitorIdentity.name} - أنا محمد`);
    }
    return greeting;
  }, [visitorIdentity?.name, t]);
  
  const [messages, setMessages] = useState<Message[]>(() => [{
    id: "m0",
    role: "assistant", 
    content: t('greeting'),
    timestamp: Date.now()
  }]);
  
  // Update initial message when visitorIdentity changes
  useEffect(() => {
    setMessages(prev => prev.map((msg, index) => 
      index === 0 && msg.role === "assistant" 
        ? { ...msg, content: welcomeLine }
        : msg
    ));
  }, [welcomeLine]);
  
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    token_count_in?: number;
    n_turns_included?: number;
    rag_hits?: number;
    summary_used?: boolean;
    compressed_summary?: boolean;
  } | null>(null);
  const [resumeBanner, setResumeBanner] = useState<{
    previousSid: string | null;
    show: boolean;
  }>({
    previousSid: null,
    show: false
  });
  const [contextLost, setContextLost] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [distanceFromBottom, setDistanceFromBottom] = useState(0);
  const autoScrollRef = useRef(true);
  const [scrollTop, setScrollTop] = useState(0);
  const lastCountedIdRef = useRef<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{
    y: number;
    scrollTop: number;
  } | null>(null);
  const inputRef = useRef<HTMLDivElement | null>(null);
  const msgsRef = useRef<HTMLDivElement | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const quickChips = useMemo(() => [{
    label: t('quickChips').intro30,
    value: lang === 'fr' ? "Présente-toi en 30 secondes." : 
           lang === 'ar' ? "قدّم نفسك في 30 ثانية." : 
           "Give me a 30-second intro."
  }, {
    label: t('quickChips').productionRigor,
    value: lang === 'fr' ? "Quel projet montre le mieux ta rigueur en production ?" :
           lang === 'ar' ? "ما هو المشروع الذي يُظهر أفضل دقتك في الإنتاج؟" :
           "Which project best shows production rigor?"
  }, {
    label: t('quickChips').timeSeriesExample,
    value: lang === 'fr' ? "Donne-moi un exemple en séries temporelles." :
           lang === 'ar' ? "أعطني مثال على السلاسل الزمنية." :
           "A time-series example?"
  }, {
    label: t('quickChips').currentWork,
    value: lang === 'fr' ? "Sur quoi as-tu travaillé chez Orange ?" :
           lang === 'ar' ? "ما الذي اشتغلت عليه في Orange؟" :
           "What did you work on at Orange?"
  }], [t, lang]);
  const MAX_QUESTIONS = 7;
  const userCount = useMemo(() => messages.filter(m => m.role === "user").length, [messages]);
  const limitReached = userCount >= MAX_QUESTIONS;
  const [parallax, setParallax] = useState({
    x: 0,
    y: 0
  });
  const [strictMode, setStrictMode] = useState(() => {
    try {
      const stored = localStorage.getItem("strict_mode");
      return stored ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });
  const isMobile = useIsMobile();
  useEffect(() => {
    document.title = "Mohamed AI - Chat";
  }, []);
  const { toast } = useToast();
  
  // Identity management functions
  const handleIdentitySaved = (identity: VisitorIdentity) => {
    setVisitorIdentity(identity);
  };
  
  const clearIdentity = async () => {
    try {
      localStorage.removeItem("visitor_identity");
      setVisitorIdentity(null);
      
      // Clear from server
      await supabase.functions.invoke("session-identity", {
        body: {
          session_id: sessionIdRef.current,
          name: null,
          email: null,
        }
      });
      
      toast({
        title: t('identityCleared'),
        description: t('identityRemoved'),
      });
    } catch (error) {
      console.error("Failed to clear identity:", error);
    }
  };
  
  // Passive name detection
  const detectNameFromMessage = (text: string) => {
    const patterns = [
      /\bmy name is\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40})/i,
      /\bi am\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40})/i,
      /\bi'm\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40})/i,
      /\bje m'appelle\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40})/i,
      /\bmoi c'?est\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40})/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const name = match[1].trim().replace(/[.,!?;:]$/, '');
        if (name.length >= 2 && name.length <= 40) {
          return name;
        }
      }
    }
    return null;
  };
  
  const debugMode = useMemo(() => new URLSearchParams(window.location.search).get("debug") === "1", []);
  useEffect(() => {
    const existing = localStorage.getItem("boukrani_chat_sid");
    const sid = existing || crypto.randomUUID();
    if (!existing) localStorage.setItem("boukrani_chat_sid", sid);
    sessionIdRef.current = sid;
  }, []);
  // Dynamic padding update function with keyboard handling
  const updatePad = useCallback(() => {
    const h = inputRef.current?.offsetHeight ?? 80;
    const kb = (window.visualViewport?.height ? (window.innerHeight - window.visualViewport.height) : 0);
    if (msgsRef.current) {
      msgsRef.current.style.paddingBottom = `${h + 8 + kb}px`;
    }
  }, []);

  // Autoscroll management per spec
  useEffect(() => {
    autoScrollRef.current = atBottom;
    if (atBottom) {
      setUnreadCount(0);
      lastCountedIdRef.current = messages[messages.length - 1]?.id ?? null;
    }
  }, [atBottom, messages]);
  useEffect(() => {
    const last = messages[messages.length - 1];
    const isAtBottom = (el: HTMLElement) => el.scrollHeight - el.scrollTop - el.clientHeight <= 64;
    if (msgsRef.current && last?.streaming && isAtBottom(msgsRef.current)) {
      msgsRef.current.scrollTo({
        top: msgsRef.current.scrollHeight,
        behavior: "smooth"
      });
    } else if (autoScrollRef.current && msgsRef.current) {
      msgsRef.current.scrollTo({
        top: msgsRef.current.scrollHeight,
        behavior: "smooth"
      });
    } else if (last?.role === "assistant") {
      setUnreadCount(c => c + 1);
    }
  }, [messages]);

  // Update padding on mount, resize, and input changes + keyboard handling
  useEffect(() => {
    updatePad();
    const handleResize = () => updatePad();
    const handleVisualViewport = () => updatePad();
    
    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewport);
      window.visualViewport.addEventListener('scroll', handleVisualViewport);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewport);
        window.visualViewport.removeEventListener('scroll', handleVisualViewport);
      }
    };
  }, [updatePad]);
  useEffect(() => {
    updatePad();
  }, [input, updatePad]);

  // Keyboard paging controls for the messages container
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = scrollRef.current;
      if (!el) return;
      if (e.key === "PageDown" || e.key === "PageUp" || e.key === "Home" || e.key === "End") {
        e.preventDefault();
        if (e.key === "PageDown") el.scrollBy({
          top: el.clientHeight,
          behavior: "smooth"
        });
        if (e.key === "PageUp") el.scrollBy({
          top: -el.clientHeight,
          behavior: "smooth"
        });
        if (e.key === "Home") el.scrollTo({
          top: 0,
          behavior: "smooth"
        });
        if (e.key === "End") el.scrollTo({
          top: el.scrollHeight,
          behavior: "smooth"
        });
      }
    };
    window.addEventListener("keydown", onKey as any, {
      passive: false
    } as any);
    return () => window.removeEventListener("keydown", onKey as any);
  }, []);
  // Language preference state for unknown languages
  const [showLangPreference, setShowLangPreference] = useState(false);
  
  // Handle language changes
  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLang(lang);
    setShowLangPreference(false);
    
    // Update welcome message
    setMessages(prev => prev.map((msg, index) => 
      index === 0 && msg.role === "assistant" 
        ? { ...msg, content: t('greeting') }
        : msg
    ));
  };
  // Debug mode and info
  const [debugLangInfo, setDebugLangInfo] = useState<{
    detectedLang: SupportedLanguage;
    currentLang: SupportedLanguage;
    tokensIn?: number;
  } | null>(null);
  const logTurn = async (user_text: string, assistant_text: string, lang: SupportedLanguage, source?: string, logToken?: string, logTs?: string) => {
    if (!logToken || !logTs) return;
    try {
      await supabase.functions.invoke("log", {
        body: {
          session_id: sessionIdRef.current,
          user_text,
          assistant_text,
          lang,
          source: source || undefined
        },
        headers: {
          "X-Log-Token": logToken,
          "X-Log-Ts": logTs,
        }
      });
    } catch (err) {
      console.warn("/api/log failed (will enable once edge function is set)", err);
    }
  };
  const sendText = async (trimmed: string, turnstileToken?: string) => {
    if (!trimmed) return;
    if (limitReached) {
      const limitText = lang === 'fr'
        ? "Merci pour ton intérêt ! Cette démo est limitée à 7 questions par session. Pour continuer la conversation, écris-moi sur LinkedIn (linkedin.com/in/mohamed-boukrani-220046210) ou par email à mohamedboukrani7@gmail.com."
        : lang === 'ar'
        ? "شكرًا على اهتمامك! هذه النسخة التجريبية محدودة بـ 7 أسئلة لكل جلسة. لمواصلة الحديث، تواصل معي على LinkedIn (linkedin.com/in/mohamed-boukrani-220046210) أو عبر البريد mohamedboukrani7@gmail.com."
        : "Thanks for your interest! This demo is limited to 7 questions per session. To keep the conversation going, reach me on LinkedIn (linkedin.com/in/mohamed-boukrani-220046210) or by email at mohamedboukrani7@gmail.com.";
      const notice: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: limitText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, notice]);
      setInput("");
      return;
    }
    // Detect language and update current language
    const detectedLang = detectLang(trimmed);
    
    // Handle mixed languages or unsupported languages
    if (hasMixedLanguages(trimmed)) {
      // For mixed languages, use the current session language
      // Could log this as interesting case
    } else if (!['fr', 'en', 'ar'].includes(detectedLang)) {
      // Unknown language - show preference dialog once
      if (!localStorage.getItem('lang_preference_asked')) {
        setShowLangPreference(true);
        localStorage.setItem('lang_preference_asked', 'true');
      }
    } else if (detectedLang !== lang) {
      // Update language if different
      setLang(detectedLang);
    }
    
    // Passive name detection for first message
    if (!visitorIdentity?.name && userCount === 0) {
      const detectedName = detectNameFromMessage(trimmed);
      if (detectedName) {
        const newIdentity = { name: detectedName, alias: visitorIdentity?.alias || makeGuestAlias(sessionIdRef.current) };
        setVisitorIdentity(newIdentity);
        localStorage.setItem("visitor_identity", JSON.stringify(newIdentity));
      }
    }
    
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    const pendingId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: pendingId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      streaming: true
    }]);
    const streamReply = (full: string) => {
      let i = 0;
      const step = Math.max(1, Math.ceil(full.length / 100));
      const interval = setInterval(() => {
        i += step;
        const slice = full.slice(0, i);
        setMessages(prev => prev.map(m => m.id === pendingId ? {
          ...m,
          content: slice
        } : m));
        if (i >= full.length) {
          clearInterval(interval);
          setMessages(prev => prev.map(m => m.id === pendingId ? {
            ...m,
            streaming: false
          } : m));
        }
      }, 20);
    };
    try {
      // Retry once on a transient failure (cold start / brief network blip) so a
      // recoverable hiccup doesn't surface the "unavailable" message to the visitor.
      let data: any, error: any;
      for (let attempt = 0; attempt < 2; attempt++) {
        ({ data, error } = await supabase.functions.invoke("chat-ai", {
          body: {
            message: trimmed,
            session_id: sessionIdRef.current,
            lang,
            temperature: 0.1,
            maxTokens: 220,
            debug: debugMode ? 1 : 0,
            strict: strictMode ? 1 : 0
          },
          headers: turnstileToken ? {
            'X-Turnstile-Token': turnstileToken
          } : undefined
        }));
        if (!error) break;
        if (attempt === 0) await new Promise(r => setTimeout(r, 1200));
      }
      const errMsg = detectedLang === 'fr'
        ? "Désolé, l'assistant est momentanément indisponible. Réessaie dans un instant."
        : detectedLang === 'ar'
        ? "عذرًا، المساعد غير متاح حاليًا. يرجى المحاولة بعد لحظات."
        : "Sorry, the assistant is unavailable right now. Please try again.";
      const replyText = error ? errMsg : data?.generatedText as string || "(No response)";
      streamReply(replyText);
      if (data?.debug && debugMode) {
        setDebugInfo(data.debug as any);
        setDebugLangInfo({
          detectedLang,
          currentLang: lang,
          tokensIn: data.debug.token_count_in
        });
      } else if (debugMode) {
        setDebugLangInfo({
          detectedLang,
          currentLang: lang
        });
      }
      void logTurn(userMsg.content, replyText, detectedLang, undefined, data?.logToken, data?.logTs);
    } catch (err) {
      console.error("chat-ai failed", err);
      const errMsg = detectedLang === 'fr'
        ? "Désolé, l'assistant est momentanément indisponible. Réessaie dans un instant."
        : detectedLang === 'ar'
        ? "عذرًا، المساعد غير متاح حاليًا. يرجى المحاولة بعد لحظات."
        : "Sorry, the assistant is unavailable right now. Please try again.";
      setMessages(prev => prev.map(m => m.id === pendingId ? {
        ...m,
        content: errMsg,
        streaming: false
      } : m));
    }
  };
  const handleSend = async (e: React.FormEvent, turnstileToken?: string) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    
    // Passive name detection if no identity is set yet
    if (!visitorIdentity?.name) {
      const detectedName = detectNameFromMessage(trimmed);
      if (detectedName) {
        const alias = visitorIdentity?.alias || makeGuestAlias(sessionIdRef.current);
        const newIdentity = { name: detectedName, alias };
        
        try {
          await supabase.functions.invoke("session-identity", {
            body: {
              session_id: sessionIdRef.current,
              name: detectedName,
            }
          });
          
          // Update localStorage and state
          localStorage.setItem("visitor_identity", JSON.stringify(newIdentity));
          setVisitorIdentity(newIdentity);
          
          toast({
            title: t('hello')(detectedName),
            description: t('notedName'),
          });
        } catch (error) {
          console.error("Failed to save detected name:", error);
        }
      }
    }
    
    await sendText(trimmed, turnstileToken);
  };

  // Auto-send a question passed from the landing chat bar (/chat?q=...)
  useEffect(() => {
    const pq = new URLSearchParams(window.location.search).get("q");
    if (!pq || !pq.trim()) return;
    const id = window.setTimeout(() => {
      window.history.replaceState({}, "", window.location.pathname);
      void sendText(pq.trim());
    }, 350);
    return () => window.clearTimeout(id);
  }, []);
  
  // Callback for LeftPanel suggested QA clicks
  const handleSuggestedQAClick = (id: string) => {
    window.dispatchEvent(new CustomEvent('suggestedQA', {
      detail: { id }
    }));
    if (isMobile) setIsProfileOpen(false);
  };
  const handleSuggestedQA = (id: string) => {
    const item = suggestedQA.find(x => x.id === id);
    if (!item) return;
    
    const userText = lang === 'fr' ? item.user_fr : item.user_en;
    const answerText = lang === 'fr' ? item.answer_fr : item.answer_en;
                       
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText,
      timestamp: Date.now()
    };
    const pendingId = crypto.randomUUID();
    setMessages(prev => [...prev, userMsg, {
      id: pendingId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true,
      canExpand: {
        userText
      }
    }]);
    let i = 0;
    const step = Math.max(1, Math.ceil(answerText.length / 100));
    const interval = setInterval(() => {
      i += step;
      const slice = answerText.slice(0, i);
      setMessages(prev => prev.map(m => m.id === pendingId ? {
        ...m,
        content: slice
      } : m));
      if (i >= answerText.length) {
        clearInterval(interval);
        setMessages(prev => prev.map(m => m.id === pendingId ? {
          ...m,
          streaming: false
        } : m));
      }
    }, 20);
    void logTurn(userText, answerText, detectLang(userText), 'suggestedQA');
  };
  useEffect(() => {
    const onSuggested = (e: Event) => {
      const id = (e as CustomEvent).detail?.id as string | undefined;
      if (id) handleSuggestedQA(id);
    };
    window.addEventListener('suggestedQA', onSuggested as any);
    return () => window.removeEventListener('suggestedQA', onSuggested as any);
  }, [messages]);
  const renderMessageHtml = (text: string) => {
    const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    const escaped = escapeHtml(text);
    const withBold = escaped.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
    const withBreaks = withBold.replace(/\n/g, "<br/>");
    return {
      __html: withBreaks
    };
  };
  return <TooltipProvider key={lang}>
    <main className="relative h-[100dvh] overflow-hidden bg-[linear-gradient(to_bottom,hsl(var(--bg-slate-start)),hsl(var(--bg-slate-end)))]">
      <div className="hidden">
        {/* Animated data flow lines */}
        <div className="absolute inset-0" style={{
          transform: `translate3d(${parallax.x * 18}px, ${parallax.y * 12}px, 0)`
        }}>
          <svg className="w-full h-full opacity-15" viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden="true">
            <g stroke={`hsl(var(--accent))`} strokeOpacity="0.22" strokeWidth="1.5" fill="none" strokeDasharray="6 10" className="animate-dash">
              <path d="M20,200 C180,120 340,260 500,200 C660,140 820,260 1000,190" />
              <path d="M80,420 C260,360 420,460 600,400 C760,340 940,460 1120,400" />
            </g>
            <g fill={`hsl(var(--accent))`} fillOpacity="0.25">
              <circle className="float-slow" cx="360" cy="240" r="2.5" />
              <circle className="float-slow" cx="740" cy="360" r="2.5" />
              <circle className="float-slow" cx="1020" cy="220" r="2.5" />
            </g>
          </svg>
        </div>
        {/* Static network layer */}
        <div className="absolute inset-0" style={{
          transform: `translate3d(${parallax.x * 8}px, ${parallax.y * 6}px, 0)`
        }}>
          <svg className="w-full h-full opacity-10" viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden="true">
            <g stroke={`hsl(var(--accent))`} strokeOpacity="0.16" strokeWidth="1" fill="none">
              <path d="M50,120 L200,80 L360,140 L520,110 L700,160 L900,120" />
              <path d="M120,300 L280,260 L420,320 L640,280 L820,340 L1040,300" />
            </g>
            <g fill={`hsl(var(--accent))`} fillOpacity="0.22">
              <circle cx="200" cy="80" r="3" />
              <circle cx="360" cy="140" r="3" />
              <circle cx="520" cy="110" r="3" />
              <circle cx="700" cy="160" r="3" />
              <circle cx="900" cy="120" r="3" />
            </g>
          </svg>
        </div>
        {/* Radial glows */}
        <div className="absolute inset-0" style={{
          transform: `translate3d(${parallax.x * -12}px, ${parallax.y * -10}px, 0)`
        }}>
          <div className="w-full h-full bg-[radial-gradient(30%_30%_at_15%_30%,hsl(var(--accent)/0.08),transparent_70%),radial-gradient(30%_30%_at_85%_70%,hsl(var(--accent)/0.06),transparent_70%)]" />
        </div>
      </div>
      <section className="relative z-0 container mx-auto px-4 md:px-6 h-full flex flex-col overflow-hidden">
        {/* Mobile App Bar */}
        {isMobile && (
          <header className="flex items-center justify-between h-14 px-4 bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <a href={import.meta.env.BASE_URL} aria-label="Back to intro" className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-accent/20 focus:outline-none focus:ring-2 focus:ring-accent/40">
                <ChevronLeft className="h-5 w-5" />
              </a>
              <span className="font-semibold text-lg">Mohamed AI</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Language pill */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    {languageCodes[lang]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleLanguageChange('en')}>
                    🇺🇸 EN
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLanguageChange('fr')}>
                    🇫🇷 FR
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLanguageChange('ar')}>
                    🇸🇦 AR
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('profile')}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[92vw] max-w-sm p-6 overflow-y-auto max-h-[100dvh]" aria-label="Profile">
                  <LeftPanel 
                    key={lang}
                    lang={lang}
                    visitorIdentity={visitorIdentity}
                    onShowIdentityModal={() => setShowIdentityModal(true)}
                    onClearIdentity={clearIdentity}
                    onLanguageChange={handleLanguageChange}
                    onSuggestedQA={handleSuggestedQAClick}
                    isMobile={isMobile}
                  />
                </SheetContent>
              </Sheet>
            </div>
          </header>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <header className="h-10 flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-full bg-background/70 backdrop-blur-sm ring-1 ring-border/60 shadow-sm px-2.5 py-1.5">
              <a href={import.meta.env.BASE_URL} aria-label="Back to intro" className="inline-flex items-center justify-center h-6 w-6 rounded-full ring-1 ring-border/50 hover:bg-accent/20 focus:outline-none focus:ring-2 focus:ring-accent/40">
                <ChevronLeft className="h-4 w-4" />
              </a>
              <Avatar className="h-6 w-6">
                <AvatarFallback>MB</AvatarFallback>
                <AvatarImage src={getPortraitUrl()} alt={getPortraitAlt()} />
              </Avatar>
              <span className="text-sm font-medium">Mohamed AI</span>
              <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-green-500" aria-label="online" />
            </div>
            <div />
          </header>
        )}
        

        {/* Desktop Layout */}
        {!isMobile && (
          <div className="grid grid-cols-[360px,1fr] gap-6 flex-1 min-h-0 overflow-hidden">
            <LeftPanel 
              key={lang}
              lang={lang}
              visitorIdentity={visitorIdentity}
              onShowIdentityModal={() => setShowIdentityModal(true)}
              onClearIdentity={clearIdentity}
              onLanguageChange={handleLanguageChange}
              onSuggestedQA={handleSuggestedQAClick}
              isMobile={isMobile}
            />
            <section className="flex flex-col h-full min-h-0 overflow-hidden">
            
              <div id="chatMessages" ref={el => {
                scrollRef.current = el;
                msgsRef.current = el;
              }} role="log" aria-live="polite" aria-atomic="false" aria-relevant="additions text" className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth pb-24 scrollbar-chat px-5 space-y-3 rounded-xl bg-background/40 backdrop-blur-sm ring-1 ring-border/50 animate-fade-in select-text" onScroll={e => {
              const el = e.currentTarget;
              const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
              setScrollTop(el.scrollTop);
              setAtTop(el.scrollTop <= 1);
              setAtBottom(dist <= 64);
              setDistanceFromBottom(dist);
              if (dist <= 64) setUnreadCount(0);
            }} onKeyDown={e => {
              const el = e.currentTarget;
              if (e.key === "PageDown" || e.key === "PageUp" || e.key === "Home" || e.key === "End") {
                e.preventDefault();
                if (e.key === "PageDown") el.scrollBy({
                  top: el.clientHeight,
                  behavior: "smooth"
                });
                if (e.key === "PageUp") el.scrollBy({
                  top: -el.clientHeight,
                  behavior: "smooth"
                });
                if (e.key === "Home") el.scrollTo({
                  top: 0,
                  behavior: "smooth"
                });
                if (e.key === "End") el.scrollTo({
                  top: el.scrollHeight,
                  behavior: "smooth"
                });
              }
            }} tabIndex={0}>
              {messages.map(m => <motion.article key={m.id} initial={{
                opacity: 0.04,
                x: m.role === "assistant" ? -2 : 2
              }} animate={{
                opacity: 1,
                x: 0,
                transition: {
                  duration: 0.14,
                  ease: "easeOut"
                }
              }} className={m.role === "assistant" ? "max-w-[72ch] rounded-2xl border border-[hsl(var(--chat-border))]/60 bg-[hsl(var(--chat-assistant))]/60 px-4 py-3 shadow-sm mt-5 select-text" : "ml-auto max-w-[72ch] rounded-2xl border border-[hsl(var(--chat-border))]/60 bg-[hsl(var(--chat-user))] px-4 py-3 shadow-sm group mt-5 select-text"} tabIndex={0} onKeyDown={e => {
                if (e.key === 'ArrowDown') {
                  const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                  next?.focus();
                  next?.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                  });
                } else if (e.key === 'ArrowUp') {
                  const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
                  prev?.focus();
                  prev?.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                  });
                }
              }}>
                  {m.streaming && m.content.length === 0 ? <div>
                      <Skeleton className="h-3 w-10/12 mb-2 rounded-2xl" />
                      <Skeleton className="h-3 w-9/12 mb-2 rounded-2xl" />
                      <Skeleton className="h-3 w-6/12 rounded-2xl" />
                      <div className="mt-2 typing-dots"><span></span><span></span><span></span></div>
                    </div> : <div>
                      <p className="text-sm leading-relaxed tracking-tight whitespace-pre-wrap break-words select-text" dangerouslySetInnerHTML={renderMessageHtml(m.content)} />
                      {m.canExpand && <div className="mt-2 flex justify-end">
                          <Button type="button" variant="secondary" size="sm" className="h-6 px-2" aria-label="Expand with AI" onClick={() => sendText(m.canExpand!.userText)}>
                            Expand with AI
                          </Button>
                        </div>}
                      {m.streaming && <div className="mt-1 typing-dots"><span></span><span></span><span></span></div>}
                      <div className="mt-1 hidden items-center gap-2 text-xs opacity-80 justify-end group-hover:flex">
                        <time>{new Date(m.timestamp).toLocaleTimeString()}</time>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="ml-2 inline-flex items-center" onClick={() => navigator.clipboard.writeText(m.content)} aria-label="Copy message">
                                <Copy className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Copy</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <button className="inline-flex items-center" aria-label="Thumbs up">
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button className="inline-flex items-center" aria-label="Thumbs down">
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>}
                </motion.article>)}
              <div ref={endRef} />
              <div className="pointer-events-none absolute right-3 bottom-28 flex flex-col gap-2 items-end">
                {unreadCount > 0 && !atBottom && <div className="pointer-events-auto rounded-full bg-background/80 ring-1 ring-border/60 px-3 py-1 text-xs shadow-sm">
                    New messages ({unreadCount}) <button onClick={() => {
                    if (!msgsRef.current) return;
                    msgsRef.current.scrollTo({
                      top: msgsRef.current.scrollHeight,
                      behavior: 'smooth'
                    });
                    setUnreadCount(0);
                  }} className="ml-1 text-accent hover:underline">⇩ Latest</button>
                  </div>}
                {!atBottom && <Button type="button" variant="secondary" size="icon" aria-label="Jump to latest" className="pointer-events-auto rounded-full shadow-md" onClick={() => {
                  if (!msgsRef.current) return;
                  msgsRef.current.scrollTo({
                    top: msgsRef.current.scrollHeight,
                    behavior: 'smooth'
                  });
                  setUnreadCount(0);
                }}>
                     <ChevronDown className="h-4 w-4" />
                   </Button>}
                 {scrollTop > 400 && <Button type="button" variant="secondary" size="icon" aria-label="Scroll to top" className="pointer-events-auto rounded-full shadow-md" onClick={() => msgsRef.current?.scrollTo({
                  top: 0,
                  behavior: 'smooth'
                })}>
                     <ChevronUp className="h-4 w-4" />
                   </Button>}
              </div>
            </div>

              <div ref={inputRef} className="sticky bottom-0 left-0 right-0 z-10 backdrop-blur-md bg-background/60 border-t border-border pt-3">
                <ChatInput onSend={handleSend} input={input} setInput={setInput} />
                <p className="px-4 pt-1 pb-3 text-[11px] text-muted-foreground">Enter = Send · Shift+Enter = New line</p>
              </div>
            </section>
          </div>
        )}

        {/* Mobile Layout */}
        {isMobile && (
          <div className="flex flex-col flex-1 min-h-0 bg-transparent">
            <div id="chatMessages" ref={el => {
              scrollRef.current = el;
              msgsRef.current = el;
            }} role="log" aria-live="polite" aria-atomic="false" aria-relevant="additions text" className="flex-1 min-h-0 overflow-y-auto overscroll-behavior-contain scroll-smooth scrollbar-chat px-4 space-y-3 select-text" onScroll={e => {
              const el = e.currentTarget;
              const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
              setScrollTop(el.scrollTop);
              setAtTop(el.scrollTop <= 1);
              setAtBottom(dist <= 64);
              setDistanceFromBottom(dist);
              if (dist <= 64) setUnreadCount(0);
            }} onKeyDown={e => {
              const el = e.currentTarget;
              if (e.key === "PageDown" || e.key === "PageUp" || e.key === "Home" || e.key === "End") {
                e.preventDefault();
                if (e.key === "PageDown") el.scrollBy({
                  top: el.clientHeight,
                  behavior: "smooth"
                });
                if (e.key === "PageUp") el.scrollBy({
                  top: -el.clientHeight,
                  behavior: "smooth"
                });
                if (e.key === "Home") el.scrollTo({
                  top: 0,
                  behavior: "smooth"
                });
                if (e.key === "End") el.scrollTo({
                  top: el.scrollHeight,
                  behavior: "smooth"
                });
              }
            }} tabIndex={0}>
              {messages.map(m => <motion.article key={m.id} initial={{
                opacity: 0.04,
                x: m.role === "assistant" ? -2 : 2
              }} animate={{
                opacity: 1,
                x: 0,
                transition: {
                  duration: 0.14,
                  ease: "easeOut"
                }
              }} className={m.role === "assistant" ? "max-w-[72ch] rounded-2xl border border-[hsl(var(--chat-border))]/60 bg-[hsl(var(--chat-assistant))]/60 px-4 py-3 shadow-sm mt-5 select-text" : "ml-auto max-w-[72ch] rounded-2xl border border-[hsl(var(--chat-border))]/60 bg-[hsl(var(--chat-user))] px-4 py-3 shadow-sm group mt-5 select-text"} tabIndex={0} onKeyDown={e => {
                if (e.key === 'ArrowDown') {
                  const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                  next?.focus();
                  next?.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                  });
                } else if (e.key === 'ArrowUp') {
                  const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
                  prev?.focus();
                  prev?.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                  });
                }
              }}>
                  {m.streaming && m.content.length === 0 ? <div>
                      <Skeleton className="h-3 w-10/12 mb-2 rounded-2xl" />
                      <Skeleton className="h-3 w-9/12 mb-2 rounded-2xl" />
                      <Skeleton className="h-3 w-6/12 rounded-2xl" />
                      <div className="mt-2 typing-dots"><span></span><span></span><span></span></div>
                    </div> : <div>
                      <p className="text-sm leading-relaxed tracking-tight whitespace-pre-wrap break-words select-text" dangerouslySetInnerHTML={renderMessageHtml(m.content)} />
                      {m.canExpand && <div className="mt-2 flex justify-end">
                          <Button type="button" variant="secondary" size="sm" className="h-6 px-2" aria-label="Expand with AI" onClick={() => sendText(m.canExpand!.userText)}>
                            Expand with AI
                          </Button>
                        </div>}
                      {m.streaming && <div className="mt-1 typing-dots"><span></span><span></span><span></span></div>}
                      <div className="mt-1 hidden items-center gap-2 text-xs opacity-80 justify-end group-hover:flex">
                        <time>{new Date(m.timestamp).toLocaleTimeString()}</time>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="ml-2 inline-flex items-center" onClick={() => navigator.clipboard.writeText(m.content)} aria-label="Copy message">
                                <Copy className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Copy</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <button className="inline-flex items-center" aria-label="Thumbs up">
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button className="inline-flex items-center" aria-label="Thumbs down">
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>}
                </motion.article>)}
              <div ref={endRef} />
              <div className="pointer-events-none absolute right-3 bottom-28 flex flex-col gap-2 items-end">
                {unreadCount > 0 && !atBottom && <div className="pointer-events-auto rounded-full bg-background/80 ring-1 ring-border/60 px-3 py-1 text-xs shadow-sm">
                    New messages ({unreadCount}) <button onClick={() => {
                    if (!msgsRef.current) return;
                    msgsRef.current.scrollTo({
                      top: msgsRef.current.scrollHeight,
                      behavior: 'smooth'
                    });
                    setUnreadCount(0);
                  }} className="ml-1 text-accent hover:underline">⇩ Latest</button>
                  </div>}
                {!atBottom && <Button type="button" variant="secondary" size="icon" aria-label="Jump to latest" className="pointer-events-auto rounded-full shadow-md" onClick={() => {
                  if (!msgsRef.current) return;
                  msgsRef.current.scrollTo({
                    top: msgsRef.current.scrollHeight,
                    behavior: 'smooth'
                  });
                  setUnreadCount(0);
                }}>
                     <ChevronDown className="h-4 w-4" />
                   </Button>}
                 {scrollTop > 400 && <Button type="button" variant="secondary" size="icon" aria-label="Scroll to top" className="pointer-events-auto rounded-full shadow-md" onClick={() => msgsRef.current?.scrollTo({
                  top: 0,
                  behavior: 'smooth'
                })}>
                     <ChevronUp className="h-4 w-4" />
                   </Button>}
              </div>
            </div>

            <div ref={inputRef} className="sticky bottom-0 inset-x-0 z-10 backdrop-blur bg-background/60 border-t border-border pt-2 pb-[max(env(safe-area-inset-bottom),8px)]">
              <ChatInput onSend={handleSend} input={input} setInput={setInput} />
              <p className="px-4 pt-1 pb-1 text-[11px] text-muted-foreground">Enter = Send · Shift+Enter = New line</p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-xs text-muted-foreground">Usage: {Math.min(userCount, MAX_QUESTIONS)}/{MAX_QUESTIONS}</div>
        {userCount >= 5 && !limitReached && (
          <div className="mt-2 text-center text-xs text-muted-foreground">
            {lang === 'fr'
              ? `${MAX_QUESTIONS - userCount} question${MAX_QUESTIONS - userCount > 1 ? 's' : ''} restante${MAX_QUESTIONS - userCount > 1 ? 's' : ''} dans cette session. Pour aller plus loin : `
              : lang === 'ar'
              ? `تبقّى ${MAX_QUESTIONS - userCount} ${MAX_QUESTIONS - userCount > 1 ? 'سؤالان' : 'سؤال'} في هذه الجلسة. للمزيد: `
              : `${MAX_QUESTIONS - userCount} question${MAX_QUESTIONS - userCount > 1 ? 's' : ''} left in this session. To go further: `}
            <a className="underline hover:text-foreground" href="https://www.linkedin.com/in/mohamed-boukrani-220046210/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            {" · "}
            <a className="underline hover:text-foreground" href="mailto:mohamedboukrani7@gmail.com">email</a>
          </div>
        )}
        <footer className="mt-2 text-center text-xs text-muted-foreground">
          {lang === 'fr' ? 'Astuce : cette démo est limitée à 7 questions par session.'
            : lang === 'ar' ? 'ملاحظة: هذه النسخة التجريبية محدودة بـ 7 أسئلة لكل جلسة.'
            : 'Tip: This demo limits to 7 questions per session.'}
          {debugMode && <div className="mt-2 text-[11px] font-mono bg-background/50 p-2 rounded border">
              <span>scrollTop: {Math.round(scrollTop)}</span>
              <span className="mx-2">•</span>
              <span>clientHeight: {msgsRef.current?.clientHeight ?? 0}</span>
              <span className="mx-2">•</span>
              <span>scrollHeight: {msgsRef.current?.scrollHeight ?? 0}</span>
              <span className="mx-2">•</span>
              <span>isAtBottom: {String(atBottom)}</span>
            </div>}
        </footer>
        
        {debugMode && (
          <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs font-mono">
            <div>Debug Info:</div>
            <div>Session: {sessionIdRef.current?.slice(0, 8)}...</div>
            <div>Identity: {visitorIdentity?.name || visitorIdentity?.alias || debugAlias}</div>
            {debugInfo && (
              <>
                <div>Tokens in: {debugInfo.token_count_in}</div>
                <div>Turns included: {debugInfo.n_turns_included}</div>
                <div>RAG hits: {debugInfo.rag_hits}</div>
                <div>Summary used: {debugInfo.summary_used ? "yes" : "no"}</div>
              </>
            )}
          </div>
        )}
      </section>
    </main>
    
    {/* Identity Modal */}
    <IdentityModal
      open={showIdentityModal}
      onOpenChange={setShowIdentityModal}
      sessionId={sessionIdRef.current}
      language={lang === 'fr' ? 'fr' : 'en'}
      onIdentitySaved={handleIdentitySaved}
    />
  </TooltipProvider>;
}