import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type SupportedLanguage } from '@/lib/language-utils';

// Profile names in different languages
export const PROFILE_NAME_EN = "Mohamed Boukrani";
export const PROFILE_NAME_FR = "Mohamed Boukrani";
export const PROFILE_NAME_AR = "محمد بوكراني"; // Correct Arabic name

// Translation resources
const RES = {
  en: {
    // Basic UI
    greeting: "Hi, I'm Mohamed. Ask me about my experience, projects, or skills.",
    settings: "Settings",
    editName: "Add/change your name",
    clearIdentity: "Clear identity",
    language: "Language",
    langChip: "EN – English",
    
    // Links
    linkedin: "LinkedIn",
    github: "GitHub", 
    cv: "CV (PDF)",
    
    // Profile
    profile: "Profile",
    editIdentity: "Edit identity",
    identityCleared: "Identity cleared",
    identityRemoved: "Your identity has been removed.",
    hello: (name: string) => `Hello ${name}!`,
    notedName: "I've noted your name.",
    
    // Strict mode
    strictMode: "Strict mode",
    strictModeCaption: "ON: concise & professional · OFF: longer & conversational",
    strictModeFull: `Strict Mode controls the style of answers:
• ON - concise, first-person, professional (2–5 sentences), less small talk.
• OFF - longer, more conversational, with extra context and examples.
This only changes tone/length; facts still follow the knowledge base and guardrails.`,
    
    // Quick chips
    quickChips: {
      intro30: "30-sec intro",
      productionRigor: "Production rigor project",
      timeSeriesExample: "Time-series example",
      currentWork: "My work at Orange"
    },
    
    // Language detection
    languagePreference: "Language preference",
    whichLanguage: "Which language do you prefer? English or French?",
    
    // Debug
    debugInfo: "Debug Info",
    detectedLang: "Detected",
    currentLang: "Current",
    tokensIn: "Tokens in"
  },
  
  fr: {
    // Basic UI
    greeting: "Bonjour, je suis Mohamed. Posez vos questions sur mon parcours, mes projets ou mes compétences.",
    settings: "Paramètres",
    editName: "Ajouter/modifier votre nom",
    clearIdentity: "Supprimer l'identité",
    language: "Langue",
    langChip: "FR – Français",
    
    // Links
    linkedin: "LinkedIn",
    github: "GitHub",
    cv: "CV (PDF)",
    
    // Profile
    profile: "Profil",
    editIdentity: "Modifier l'identité",
    identityCleared: "Identité effacée",
    identityRemoved: "Votre identité a été supprimée.",
    hello: (name: string) => `Bonjour ${name}!`,
    notedName: "J'ai noté votre nom.",
    
    // Strict mode
    strictMode: "Mode strict",
    strictModeCaption: "ON : concis & pro · OFF : plus détaillé & conversationnel",
    strictModeFull: `Le Mode strict contrôle le style des réponses :
• ON - concis, à la première personne, professionnel (2–5 phrases), peu de bavardage.
• OFF - plus long et conversationnel, avec davantage de contexte et d'exemples.
Cela ne change pas les faits : le bot reste fidèle à la base de connaissances et aux garde-fous.`,
    
    // Quick chips
    quickChips: {
      intro30: "Intro 30 s",
      productionRigor: "Projet rigueur prod",
      timeSeriesExample: "Exemple séries temporelles",
      currentWork: "Mes missions chez Orange"
    },
    
    // Language detection
    languagePreference: "Préférence linguistique",
    whichLanguage: "Vous préférez répondre en français ou en anglais ?",
    
    // Debug
    debugInfo: "Infos Debug",
    detectedLang: "Détectée",
    currentLang: "Actuelle",
    tokensIn: "Tokens entrants"
  },
  
  ar: {
    // Basic UI
    greeting: "مرحباً - أنا محمد. اسألني عن خبرتي ومشاريعي ومهاراتي.",
    settings: "الإعدادات",
    editName: "إضافة/تغيير اسمك",
    clearIdentity: "مسح الهوية",
    language: "اللغة",
    langChip: "AR - العربية",
    
    // Links
    linkedin: "لينكدإن",
    github: "غيتهاب",
    cv: "السيرة الذاتية (PDF)",
    
    // Profile
    profile: "الملف الشخصي",
    editIdentity: "تعديل الهوية",
    identityCleared: "تم مسح الهوية",
    identityRemoved: "تم حذف هويتك.",
    hello: (name: string) => `مرحباً ${name}!`,
    notedName: "لقد سجلت اسمك.",
    
    // Strict mode
    strictMode: "الوضع الصارم",
    strictModeCaption: "تشغيل: موجز ومهني · إيقاف: أطول وحواري",
    strictModeFull: `الوضع الصارم يتحكم في أسلوب الإجابات:
• تشغيل - موجز، ضمير المتكلم، مهني (2-5 جمل)، أقل حديث جانبي.
• إيقاف - أطول وأكثر حوارية، مع سياق وأمثلة إضافية.
هذا يغير فقط النبرة/الطول؛ الحقائق تتبع قاعدة المعرفة والضوابط.`,
    
    // Quick chips
    quickChips: {
      intro30: "تعريف 30 ثانية",
      productionRigor: "مشروع الدقة الإنتاجية",
      timeSeriesExample: "مثال السلاسل الزمنية",
      currentWork: "عملي في Orange"
    },
    
    // Language detection
    languagePreference: "تفضيل اللغة",
    whichLanguage: "أي لغة تفضل؟ الإنجليزية أم الفرنسية؟",
    
    // Debug
    debugInfo: "معلومات التصحيح",
    detectedLang: "المكتشفة",
    currentLang: "الحالية",
    tokensIn: "الرموز الداخلة"
  }
} as const;

type TranslationKey = keyof typeof RES.en;

interface I18nContextValue {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey) => any;
  profileName: string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

// Get initial language from localStorage or browser
function getInitialLang(): SupportedLanguage {
  try {
    const stored = localStorage.getItem('chat_lang');
    if (stored && ['fr', 'en', 'ar'].includes(stored)) {
      return stored as SupportedLanguage;
    }
  } catch {
    // localStorage might not be available
  }

  // Fallback to navigator language
  if (typeof navigator !== 'undefined' && navigator.language) {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('fr')) return 'fr';
    if (browserLang.startsWith('ar')) return 'ar';
  }

  return 'en'; // Default fallback
}

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [lang, setLangState] = useState<SupportedLanguage>(getInitialLang);

  const setLang = (newLang: SupportedLanguage) => {
    setLangState(newLang);
    
    // Persist to localStorage
    try {
      localStorage.setItem('chat_lang', newLang);
    } catch {
      // localStorage might not be available
    }
    
    // Update document attributes
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  // Set initial document attributes
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = (key: TranslationKey): any => {
    return RES[lang]?.[key] ?? RES.en[key] ?? key;
  };

  const profileName = lang === 'ar' ? PROFILE_NAME_AR : PROFILE_NAME_EN;

  const value: I18nContextValue = {
    lang,
    setLang,
    t,
    profileName
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}