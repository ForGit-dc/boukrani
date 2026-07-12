import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Github, Linkedin, FileText, ExternalLink, User, Edit3, X, Globe } from "lucide-react";
import { getPortraitUrl, getPortraitAlt } from "@/config";
import { suggestedQA } from "@/data/knowledge";
import { languageCodes, languageNames, type SupportedLanguage } from "@/lib/language-utils";

// Lightweight strings map for left panel only
const LSTR = {
  en: {
    settings: "Settings",
    editName: "Add/Edit your name",
    language: "Language",
    langChip: "EN – English",
    linkedin: "LinkedIn",
    github: "GitHub",
    cv: "EGC 2026 paper"
  },
  fr: {
    settings: "Paramètres",
    editName: "Ajouter/Modifier votre nom",
    language: "Langue",
    langChip: "FR – Français",
    linkedin: "LinkedIn",
    github: "GitHub",
    cv: "Article EGC 2026"
  },
  ar: {
    settings: "الإعدادات",
    editName: "إضافة/تغيير اسمك",
    language: "اللغة",
    langChip: "AR - العربية",
    linkedin: "لينكدإن",
    github: "غيتهاب",
    cv: "مقال EGC 2026"
  }
};

const tr = (lang: string, k: string) => (LSTR[lang as keyof typeof LSTR] && LSTR[lang as keyof typeof LSTR][k as keyof typeof LSTR.en]) || LSTR.en[k as keyof typeof LSTR.en] || k;

interface VisitorIdentity {
  name?: string;
  alias: string;
}

interface LeftPanelProps {
  lang: SupportedLanguage;
  visitorIdentity: VisitorIdentity | null;
  onShowIdentityModal: () => void;
  onClearIdentity: () => void;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onSuggestedQA: (id: string) => void;
  isMobile: boolean;
}

export const LeftPanel = memo(function LeftPanel({
  lang,
  visitorIdentity,
  onShowIdentityModal,
  onClearIdentity,
  onLanguageChange,
  onSuggestedQA,
  isMobile
}: LeftPanelProps) {
  // Display name per language
  const displayName = lang === "ar" ? "محمد بوكراني" : "Mohamed Boukrani";

  const profileContent = (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-24 w-24 ring-2 ring-accent/30 shadow-sm">
          <AvatarFallback>MB</AvatarFallback>
          <AvatarImage src="/portrait.jpg" alt={getPortraitAlt()} className="object-cover" />
        </Avatar>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">{displayName}</h2>
        <p className="text-sm text-primary mt-1 tracking-tight">Data Scientist (ENSAI & INSEA)</p>
      </div>
      <Separator />
      <nav aria-label="Profile links" className="space-y-2">
        <Button asChild variant="outline" className="w-full justify-start">
          <a href="https://www.linkedin.com/in/mohamed-boukrani-220046210/" target="_blank" rel="noopener noreferrer">
            <Linkedin className="mr-2" /> {tr(lang, 'linkedin')} <ExternalLink className="ml-auto" />
          </a>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start">
          <a href="https://github.com/mohamedcoder07" target="_blank" rel="noopener noreferrer">
            <Github className="mr-2" /> {tr(lang, 'github')} <ExternalLink className="ml-auto" />
          </a>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start">
          <a href="https://editions-rnti.fr/?inprocid=1003082&lg=fr" target="_blank" rel="noopener noreferrer">
            <FileText className="mr-2" /> {tr(lang, 'cv')} <ExternalLink className="ml-auto" />
          </a>
        </Button>
      </nav>
      <Separator />
      {/* Identity Settings */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{tr(lang, 'settings')}</h3>
        {visitorIdentity?.name ? (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{visitorIdentity.name}</span>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onShowIdentityModal}
                className="h-7 px-2"
                title={tr(lang, 'editName')}
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearIdentity}
                className="h-7 px-2 text-destructive hover:text-destructive"
                title="Clear identity"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onShowIdentityModal}
            className="w-full justify-start"
          >
            <User className="h-4 w-4 mr-2" />
            {tr(lang, 'editName')}
          </Button>
        )}
        
        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Globe className="h-4 w-4 mr-2" />
              {languageCodes[lang]} - {languageNames[lang]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onLanguageChange('en')}>
              🇺🇸 EN - English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLanguageChange('fr')}>
              🇫🇷 FR - Français
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLanguageChange('ar')}>
              🇸🇦 AR - العربية
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Separator />
      <div className="flex flex-wrap gap-2" aria-label="Suggested Q&A">
        {suggestedQA.map(q => (
          <Button 
            key={q.id} 
            type="button" 
            variant="secondary" 
            size="sm" 
            onClick={() => onSuggestedQA(q.id)}
            aria-label={q.label_en}
          >
            {lang === 'fr' ? q.label_fr : q.label_en}
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <aside 
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="sticky top-16 max-h-[calc(100dvh-112px)] overflow-y-auto overscroll-contain"
    >
      <Card className="p-5 bg-card/50 border-border">
        {profileContent}
      </Card>
    </aside>
  );
});