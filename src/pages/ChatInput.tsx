import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useRef, useEffect } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: any) => string;
      getResponse: (widgetId: string) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

type Props = {
  onSend: (e: React.FormEvent, turnstileToken?: string) => void;
  input: string;
  setInput: (v: string) => void;
};

export function ChatInput({ onSend, input, setInput }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Load Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.turnstile && turnstileRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: '0x4AAAAAAAzxlMvAaSFpbB5n', // Cloudflare Turnstile site key (public, safe to commit)
          theme: 'dark',
          size: 'compact',
        });
      }
    };

    return () => {
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
      }
      document.body.removeChild(script);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = window.turnstile && widgetIdRef.current 
      ? window.turnstile.getResponse(widgetIdRef.current)
      : undefined;
    onSend(e, token);
    
    // Reset turnstile after submission
    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="px-4 pb-2 space-y-2">
      <div ref={turnstileRef} className="flex justify-center" />
      <div className="flex gap-2 items-end rounded-xl border border-border bg-card/70 backdrop-blur-sm p-1.5 pl-3.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
        <Textarea
          aria-label="Type your question"
          placeholder="Ask anything - FR/EN auto-detected"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          className="flex-1 min-h-[44px] max-h-32 overflow-auto resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button type="submit" variant="hero" size="icon" aria-label="Send" className="shrink-0 rounded-lg">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
