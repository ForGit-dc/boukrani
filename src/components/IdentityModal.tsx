import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface IdentityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  language: 'en' | 'fr';
  onIdentitySaved: (identity: { name?: string; alias: string }) => void;
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

const copy = {
  en: {
    title: "Introduce yourself (optional)",
    lead: "Share your name so I can personalize the chat.",
    namePlaceholder: "Your name",
    consent: "I agree my name may appear in the alert Mohamed receives.",
    btnSave: "Save",
    btnGuest: "Continue as Guest",
    btnSkip: "Skip for now",
    note: "You can change this later from the header.",
    saved: "Identity saved successfully!",
    error: "Failed to save identity. Please try again."
  },
  fr: {
    title: "Se présenter (optionnel)",
    lead: "Partagez votre prénom pour personnaliser l'échange.",
    namePlaceholder: "Votre prénom",
    consent: "J'accepte que mon prénom apparaisse dans l'alerte reçue par Mohamed.",
    btnSave: "Enregistrer",
    btnGuest: "Continuer en invité",
    btnSkip: "Plus tard",
    note: "Vous pourrez le modifier ensuite depuis l'en-tête.",
    saved: "Identité enregistrée avec succès!",
    error: "Échec de l'enregistrement. Veuillez réessayer."
  }
};

export function IdentityModal({ open, onOpenChange, sessionId, language, onIdentitySaved }: IdentityModalProps) {
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const t = copy[language];

  const sanitizeInput = (input: string, maxLength = 40) => {
    return input.trim().replace(/\s+/g, ' ').slice(0, maxLength);
  };

  const saveIdentity = async (nameValue?: string, emailValue?: string, consentValue = false) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('session-identity', {
        body: {
          session_id: sessionId,
          name: nameValue ? sanitizeInput(nameValue) : null,
          email: emailValue ? sanitizeInput(emailValue, 100) : null,
          consent: consentValue,
        },
      });

      if (error) throw error;

      const alias = data?.alias || makeGuestAlias(sessionId);
      const identity = nameValue ? { name: sanitizeInput(nameValue), alias } : { alias };
      
      // Save to localStorage
      localStorage.setItem('visitor_identity', JSON.stringify(identity));
      
      onIdentitySaved(identity);
      toast({ description: t.saved });
      onOpenChange(false);
      
    } catch (error) {
      console.error('Failed to save identity:', error);
      toast({ 
        description: t.error,
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    const trimmedName = sanitizeInput(name);
    if (trimmedName) {
      saveIdentity(trimmedName, undefined, consent);
    }
  };

  const handleContinueAsGuest = () => {
    saveIdentity();
  };

  const handleSkip = () => {
    // Just close without saving - keeps alias in localStorage
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t.lead}</p>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">{t.namePlaceholder}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                maxLength={40}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(checked) => setConsent(checked === true)}
                disabled={isLoading}
              />
              <Label htmlFor="consent" className="text-sm leading-relaxed">
                {t.consent}
              </Label>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={isLoading || !name.trim()}
              className="flex-1"
            >
              {t.btnSave}
            </Button>
            <Button
              variant="outline"
              onClick={handleContinueAsGuest}
              disabled={isLoading}
              className="flex-1"
            >
              {t.btnGuest}
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isLoading}
              size="sm"
            >
              {t.btnSkip}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            {t.note}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
