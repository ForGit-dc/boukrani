import { SupportedLanguage } from './language-utils';

export interface Translations {
  // Greetings
  greeting: string;
  
  // UI Elements
  profile: string;
  settings: string;
  addChangeName: string;
  editIdentity: string;
  clearIdentity: string;
  identityCleared: string;
  identityRemoved: string;
  hello: (name: string) => string;
  notedName: string;
  
  // Strict mode
  strictMode: string;
  strictModeCaption: string;
  strictModeFull: string;
  
  // Quick chips
  quickChips: {
    intro30: string;
    productionRigor: string;
    timeSeriesExample: string;
    currentWork: string;
  };
  
  // Language detection
  languagePreference: string;
  whichLanguage: string;
  
  // Debug
  debugInfo: string;
  detectedLang: string;
  currentLang: string;
  tokensIn: string;
}

export const translations: Record<SupportedLanguage, Translations> = {
  en: {
    greeting: "Hi, I'm Mohamed. Ask me about my experience, projects, or skills.",
    profile: "Profile",
    settings: "Settings", 
    addChangeName: "Add/change your name",
    editIdentity: "Edit identity",
    clearIdentity: "Clear identity",
    identityCleared: "Identity cleared",
    identityRemoved: "Your identity has been removed.",
    hello: (name: string) => `Hello ${name}!`,
    notedName: "I've noted your name.",
    strictMode: "Strict mode",
    strictModeCaption: "ON: concise & professional · OFF: longer & conversational",
    strictModeFull: `Strict Mode controls the style of answers:
• ON - concise, first-person, professional (2–5 sentences), less small talk.
• OFF - longer, more conversational, with extra context and examples.
This only changes tone/length; facts still follow the knowledge base and guardrails.`,
    quickChips: {
      intro30: "30-sec intro",
      productionRigor: "Production rigor project",
      timeSeriesExample: "Time-series example",
      currentWork: "My work at Orange"
    },
    languagePreference: "Language preference",
    whichLanguage: "Which language do you prefer? English or French?",
    debugInfo: "Debug Info",
    detectedLang: "Detected",
    currentLang: "Current",
    tokensIn: "Tokens in"
  },
  
  fr: {
    greeting: "Bonjour, je suis Mohamed. Posez vos questions sur mon parcours, mes projets ou mes compétences.",
    profile: "Profil",
    settings: "Paramètres",
    addChangeName: "Ajouter/modifier votre nom", 
    editIdentity: "Modifier l'identité",
    clearIdentity: "Supprimer l'identité",
    identityCleared: "Identité effacée",
    identityRemoved: "Votre identité a été supprimée.",
    hello: (name: string) => `Bonjour ${name}!`,
    notedName: "J'ai noté votre nom.",
    strictMode: "Mode strict",
    strictModeCaption: "ON : concis & pro · OFF : plus détaillé & conversationnel",
    strictModeFull: `Le Mode strict contrôle le style des réponses :
• ON - concis, à la première personne, professionnel (2–5 phrases), peu de bavardage.
• OFF - plus long et conversationnel, avec davantage de contexte et d'exemples.
Cela ne change pas les faits : le bot reste fidèle à la base de connaissances et aux garde-fous.`,
    quickChips: {
      intro30: "Intro 30 s",
      productionRigor: "Projet rigueur prod",
      timeSeriesExample: "Exemple séries temporelles",
      currentWork: "Mes missions chez Orange"
    },
    languagePreference: "Préférence linguistique",
    whichLanguage: "Vous préférez répondre en français ou en anglais ?",
    debugInfo: "Infos Debug",
    detectedLang: "Détectée",
    currentLang: "Actuelle", 
    tokensIn: "Tokens entrants"
  },
  
  ar: {
    greeting: "مرحباً - أنا محمد. اسألني عن خبرتي ومشاريعي ومهاراتي.",
    profile: "الملف الشخصي",
    settings: "الإعدادات",
    addChangeName: "إضافة/تغيير اسمك",
    editIdentity: "تعديل الهوية", 
    clearIdentity: "مسح الهوية",
    identityCleared: "تم مسح الهوية",
    identityRemoved: "تم حذف هويتك.",
    hello: (name: string) => `مرحباً ${name}!`,
    notedName: "لقد سجلت اسمك.",
    strictMode: "الوضع الصارم",
    strictModeCaption: "تشغيل: موجز ومهني · إيقاف: أطول وحواري",
    strictModeFull: `الوضع الصارم يتحكم في أسلوب الإجابات:
• تشغيل - موجز، ضمير المتكلم، مهني (2-5 جمل)، أقل حديث جانبي.
• إيقاف - أطول وأكثر حوارية، مع سياق وأمثلة إضافية.
هذا يغير فقط النبرة/الطول؛ الحقائق تتبع قاعدة المعرفة والضوابط.`,
    quickChips: {
      intro30: "تعريف 30 ثانية",
      productionRigor: "مشروع الدقة الإنتاجية", 
      timeSeriesExample: "مثال السلاسل الزمنية",
      currentWork: "عملي في Orange"
    },
    languagePreference: "تفضيل اللغة",
    whichLanguage: "أي لغة تفضل؟ الإنجليزية أم الفرنسية؟",
    debugInfo: "معلومات التصحيح",
    detectedLang: "المكتشفة",
    currentLang: "الحالية",
    tokensIn: "الرموز الداخلة"
  }
};

export function getTranslation(lang: SupportedLanguage): Translations {
  return translations[lang] || translations.en;
}