import { franc } from 'franc-min';

export type SupportedLanguage = 'fr' | 'en' | 'ar';

// French stopwords for heuristic detection
const frenchStopwords = ['le', 'la', 'les', 'des', 'une', 'un', 'je', 'vous', 'nous', 'et', 'ou', 'pour', 'avec', 'dans', 'sur', 'par', 'est', 'sont', 'avoir', 'être', 'faire', 'dire', 'aller', 'voir', 'savoir', 'prendre', 'venir', 'vouloir', 'devoir', 'plus', 'grand', 'nouveau', 'premier', 'dernier', 'bon', 'mauvais', 'petit', 'autre', 'même', 'tout', 'tous', 'toute', 'toutes', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs'];

// English stopwords for heuristic detection
const englishStopwords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'];

// Get stored session language with fallback hierarchy
export function getSessionLang(): SupportedLanguage {
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

// Set session language in localStorage
export function setSessionLang(lang: SupportedLanguage): void {
  try {
    localStorage.setItem('chat_lang', lang);
  } catch {
    // localStorage might not be available
  }
}

// Detect language from text with confidence
export function detectLang(text: string): SupportedLanguage {
  if (!text || text.trim().length === 0) {
    return getSessionLang();
  }

  const cleanText = text.trim().toLowerCase();
  
  // 1. Arabic detection - check for Arabic Unicode range
  if (/[\u0600-\u06FF]/.test(text)) {
    return 'ar';
  }

  // 2. Short text handling - fall back to session language
  if (cleanText.length <= 10) {
    // Check for very common short words
    const shortWords = ['hi', 'hey', 'hello', 'ok', 'yes', 'no', 'thanks', 'bye'];
    const frenchShortWords = ['salut', 'oui', 'non', 'merci', 'bonjour', 'bonsoir'];
    
    if (frenchShortWords.some(word => cleanText.includes(word))) {
      return 'fr';
    }
    if (shortWords.some(word => cleanText.includes(word))) {
      return 'en';
    }
    
    return getSessionLang();
  }

  // 3. Use franc for longer texts
  try {
    const detected = franc(text);
    if (detected === 'fra') return 'fr';
    if (detected === 'eng') return 'en';
    if (detected === 'arb') return 'ar';
  } catch {
    // franc failed, fall back to heuristics
  }

  // 4. Heuristic detection using stopwords
  const words = cleanText.split(/\s+/);
  let frenchScore = 0;
  let englishScore = 0;

  for (const word of words) {
    if (frenchStopwords.includes(word)) frenchScore++;
    if (englishStopwords.includes(word)) englishScore++;
  }

  // Calculate confidence based on text length
  const totalWords = words.length;
  const frenchConfidence = totalWords > 0 ? frenchScore / totalWords : 0;
  const englishConfidence = totalWords > 0 ? englishScore / totalWords : 0;

  // Need at least 20% stopword match for confidence
  if (frenchConfidence > 0.2 && frenchConfidence > englishConfidence) {
    return 'fr';
  }
  if (englishConfidence > 0.2 && englishConfidence > frenchConfidence) {
    return 'en';
  }

  // 5. Final fallback to session language
  return getSessionLang();
}

// Language display names
export const languageNames: Record<SupportedLanguage, string> = {
  en: 'English',
  fr: 'Français', 
  ar: 'العربية'
};

// Language codes for display
export const languageCodes: Record<SupportedLanguage, string> = {
  en: 'EN',
  fr: 'FR',
  ar: 'AR'
};

// Check if text contains mixed languages (for edge case handling)
export function hasMixedLanguages(text: string): boolean {
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  
  return hasArabic && hasLatin;
}

// Get language direction for CSS
export function getLanguageDirection(lang: SupportedLanguage): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}