import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Github, Linkedin, FileText } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { LANDING_COPY } from "./landingCopy";
import "./landing.css";

const LINKEDIN = "https://www.linkedin.com/in/mohamed-boukrani-220046210/";
const GITHUB = "https://github.com/mohamedcoder07";
const PAPER = "https://editions-rnti.fr/?inprocid=1003082&lg=fr";

const HERO_EXAMPLES: Record<string, string[]> = {
  fr: ["Présente-toi en 30 secondes", "Parle-moi de ton article EGC 2026", "Quel impact concret as-tu livré ?", "Pourquoi devrait-on te recruter ?"],
  en: ["Give me a 30-second intro", "Tell me about your EGC 2026 paper", "What concrete impact have you delivered?", "Why should we hire you?"],
  ar: ["قدّم نفسك في 30 ثانية", "حدّثني عن مقالك في EGC 2026", "ما هو أثرك الملموس؟", "لماذا يجب أن نوظّفك؟"],
};

export default function DataScientistHero() {
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();
  const c = (LANDING_COPY as Record<string, typeof LANDING_COPY.en>)[lang] ?? LANDING_COPY.en;
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [q, setQ] = useState("");
  const [ph, setPh] = useState("");
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const go = (question: string) => navigate(question ? `/chat?q=${encodeURIComponent(question)}` : "/chat");

  // Readable typewriter placeholder: types example questions one at a time.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setPh(""); return; }
    const list = HERO_EXAMPLES[lang] ?? HERO_EXAMPLES.en;
    let i = 0, n = 0, deleting = false, timer = 0, alive = true;
    const tick = () => {
      if (!alive) return;
      const full = list[i];
      n = deleting ? n - 1 : n + 1;
      setPh(full.slice(0, n));
      if (!deleting && n >= full.length) { deleting = true; timer = window.setTimeout(tick, 2000); return; }
      if (deleting && n <= 0) { deleting = false; i = (i + 1) % list.length; timer = window.setTimeout(tick, 350); return; }
      timer = window.setTimeout(tick, deleting ? 30 : 58);
    };
    timer = window.setTimeout(tick, 700);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [lang]);

  // Top-bar border + scroll reveal
  useEffect(() => {
    const onScroll = () => barRef.current?.classList.toggle("scrolled", window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = rootRef.current?.querySelectorAll<HTMLElement>(".reveal") ?? [];
    let io: IntersectionObserver | undefined;
    if (reduce) {
      els.forEach((el) => el.classList.add("in"));
    } else {
      io = new IntersectionObserver(
        (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io?.unobserve(e.target); } }),
        { threshold: 0.14 },
      );
      els.forEach((el) => io!.observe(el));
    }
    return () => { window.removeEventListener("scroll", onScroll); io?.disconnect(); };
  }, []);

  // Hero background: INCANDESCENT SIGNALS. Smooth time-series curves glow
  // ember-orange over deep black, with data points traveling along them; the
  // cursor bends the signal locally, like an analyst probing a curve. Echoes
  // Mohamed's forecasting work (SARIMA-LSTM at CREST) and the Orange identity.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, raf = 0, resizeTimer = 0;
    const mouse = { x: -9999, y: -9999, active: false };
    type Dot = { u: number; v: number; r: number };
    type Wave = { y0: number; amp: number; wl: number; speed: number; phase: number; ember: boolean; alpha: number; dots: Dot[] };
    let waves: Wave[] = [];

    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const build = () => {
      const N = Math.max(5, Math.min(8, Math.round(h / 120)));
      waves = [];
      for (let i = 0; i < N; i++) {
        const ember = i % 3 !== 2;
        waves.push({
          y0: (h * (i + 0.7)) / (N + 0.4),
          amp: 14 + Math.random() * 24,
          wl: 240 + Math.random() * 240,
          speed: 0.4 + Math.random() * 0.7,
          phase: Math.random() * Math.PI * 2,
          ember,
          alpha: ember ? 0.16 + Math.random() * 0.1 : 0.07 + Math.random() * 0.05,
          dots: Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => ({ u: Math.random(), v: 0.0006 + Math.random() * 0.0012, r: 1.6 + Math.random() * 1.8 })),
        });
      }
    };
    const yAt = (wv: Wave, x: number, now: number) => {
      let y = wv.y0 + wv.amp * Math.sin((x / wv.wl) * Math.PI * 2 + wv.phase + now * 0.0004 * wv.speed);
      if (mouse.active) {
        const dx = x - mouse.x;
        const dy = mouse.y - y;
        y += dy * Math.exp(-(dx * dx) / (2 * 150 * 150)) * Math.exp(-(dy * dy) / (2 * 190 * 190)) * 0.85;
      }
      return y;
    };
    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const wv of waves) {
        ctx.beginPath();
        ctx.lineWidth = wv.ember ? 1.4 : 1;
        ctx.strokeStyle = wv.ember ? `rgba(255,121,0,${wv.alpha.toFixed(3)})` : `rgba(242,237,228,${wv.alpha.toFixed(3)})`;
        for (let x = 0; x <= w; x += 6) {
          const y = yAt(wv, x, now);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (const wv of waves) {
        for (const d of wv.dots) {
          if (!reduce) { d.u += d.v * wv.speed; if (d.u > 1.02) d.u = -0.02; }
          const x = d.u * w;
          const y = yAt(wv, x, now);
          const ddx = x - mouse.x, ddy = y - mouse.y;
          const near = mouse.active ? Math.max(0, 1 - Math.sqrt(ddx * ddx + ddy * ddy) / 200) : 0;
          ctx.beginPath();
          ctx.arc(x, y, d.r * (1 + 0.8 * near), 0, Math.PI * 2);
          if (wv.ember) { ctx.fillStyle = "#FF7900"; ctx.shadowColor = "#FF7900"; ctx.shadowBlur = 12 + 10 * near; ctx.globalAlpha = 0.75 + 0.25 * near; }
          else { ctx.fillStyle = "rgba(242,237,228,0.8)"; ctx.shadowBlur = 0; ctx.globalAlpha = 0.5 + 0.3 * near; }
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    };
    const step = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(step);
    };
    const onMove = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = mouse.x >= 0 && mouse.y >= 0 && mouse.x <= w && mouse.y <= h; };
    const onLeave = () => { mouse.active = false; };
    const start = () => { size(); build(); if (reduce) { draw(0); } else { cancelAnimationFrame(raf); raf = requestAnimationFrame(step); } };
    const onResize = () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(start, 200); };
    start();
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => { cancelAnimationFrame(raf); window.clearTimeout(resizeTimer); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseout", onLeave); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <div className="lp" ref={rootRef} dir={dir}>
      <header className="bar" ref={barRef}>
        <div className="wrap bar-inner">
          <a className="brand" href="#top"><span className="dot" />MOHAMED&nbsp;BOUKRANI</a>
          <nav className="nav">
            <a href="#signature">{c.nav.investigation}</a>
            <a href="#track">{c.nav.track}</a>
            <a href="#signals">{c.nav.signals}</a>
            <a href="#talk">{c.nav.contact}</a>
          </nav>
          <div className="bar-right">
            <div className="lang-switch" role="group" aria-label="Language">
              <button type="button" className={lang === "fr" ? "on" : ""} onClick={() => setLang("fr")}>FR</button>
              <button type="button" className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
              <button type="button" className={lang === "ar" ? "on" : ""} onClick={() => setLang("ar")}>ع</button>
            </div>
            <span className="bar-div" aria-hidden="true" />
            <div className="bar-links">
              <a href={LINKEDIN} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn"><Linkedin size={19} /></a>
              <a href={GITHUB} target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub"><Github size={19} /></a>
              <a href={PAPER} target="_blank" rel="noopener noreferrer" aria-label="EGC 2026 paper" title="EGC 2026 paper"><FileText size={19} /></a>
            </div>
          </div>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <canvas className="field" ref={canvasRef} aria-hidden="true" />
          <div className="wrap">
            <span className="eyebrow">{c.eyebrow}</span>
            <h1>
              {c.hero.l1}<span className="glow">{c.hero.glow}</span>{c.hero.l2}
              <span className="ship">{c.hero.shipPre}<b>{c.hero.shipStrong}</b></span>
            </h1>
            <p className="lede">{c.lede}</p>

            {/* The chat IS the portfolio: this bar is the primary action */}
            <form className="chatbar" onSubmit={(e) => { e.preventDefault(); go(q.trim()); }}>
              <input
                className="chatbar-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={focused || q ? c.chat.placeholder : (ph ? ph + "▌" : c.chat.placeholder)}
                aria-label={c.chat.placeholder}
              />
              <button className="chatbar-send" type="submit">{c.chat.send}<span className="arr">→</span></button>
            </form>
            <div className="chips">
              {c.chips.map((chip, i) => (
                <button key={i} type="button" className="chip-btn" onClick={() => go(chip.q)}>{chip.label}</button>
              ))}
            </div>
            <a className="see-inv" href="#signature">{c.seeInv} →</a>

            <div className="status">
              <span className="pulse" />
              {c.status.prefix}&nbsp; <b>{c.status.role}</b> &nbsp;·&nbsp; {c.status.loc}
            </div>
          </div>
        </section>

        {/* READOUT */}
        <section className="block" id="readout">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="marker">01</span>
              <div><div className="lab">{c.readout.lab}</div><h2>{c.readout.h2}</h2></div>
            </div>
            <div className="readout">
              <div className="readout-left reveal">
                <figure className="portrait">
                  <img src="/portrait.jpg" alt="Mohamed Boukrani" loading="lazy"
                    onError={(e) => { const f = e.currentTarget.closest(".portrait"); if (f) (f as HTMLElement).style.display = "none"; }} />
                  <figcaption className="frame-tag">Paris · 2026</figcaption>
                </figure>
                <div className="card">
                  <div className="row"><span className="k">{c.card.role}</span><span className="v acc">{c.card.roleV}</span></div>
                  <div className="row"><span className="k">{c.card.base}</span><span className="v">{c.card.baseV}</span></div>
                  <div className="row"><span className="k">{c.card.degrees}</span><span className="v">{c.card.degreesV}</span></div>
                  <div className="row"><span className="k">{c.card.focus}</span><span className="v">{c.card.focusV}</span></div>
                  <div className="row"><span className="k">{c.card.cloud}</span><span className="v">{c.card.cloudV}</span></div>
                  <div className="row"><span className="k">{c.card.languages}</span><span className="v">{c.card.languagesV}</span></div>
                </div>
              </div>
              <div className="bio reveal">
                <p>{c.bio.p1}</p>
                <p className="quote">{c.bio.quote}</p>
                <p className="sig">{c.bio.sig}</p>
              </div>
            </div>
          </div>
        </section>

        {/* SIGNATURE PUBLICATION (static feature card, no iframe) */}
        <section className="block signature" id="signature">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="marker">02</span>
              <div>
                <div className="lab">{c.inv.lab}</div>
                <h2 className="sig-title">{c.inv.titlePre}<span className="em">{c.inv.titleEm}</span>{c.inv.titlePost}</h2>
              </div>
            </div>
            <div className="out reveal">
              <div className="tag">{c.inv.tag}</div>
              <h3>{c.inv.paperTitle}</h3>
              <p>{c.inv.paperDesc}</p>
              <div className="chips"><span className="chip">Influence functions</span><span className="chip">Label noise</span><span className="chip">scikit-learn</span></div>
              <p><a className="btn btn-primary" href={PAPER} target="_blank" rel="noopener noreferrer">{c.inv.open}</a></p>
            </div>
            <div className="sig-grid reveal">
              {c.stats.map((label, i) => (
                <div className="stat" key={i}>
                  <div className="n">{["14", "136 000", "75%", "84%"][i]}</div>
                  <div className="l">{label}</div>
                </div>
              ))}
            </div>
            <p className="sig-note reveal">{c.sigNote}</p>
          </div>
        </section>

        {/* TRACK RECORD */}
        <section className="block" id="track">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="marker">03</span>
              <div><div className="lab">{c.track.lab}</div><h2>{c.track.h2}</h2></div>
            </div>
            <div className="tl">
              {c.track.items.map((it, i) => (
                <div className="tl-item reveal" key={i}>
                  <span className="num">0{i + 1}</span>
                  <div><h3>{it.title}<span className="org">{it.org}</span></h3><p><b className="tl-metric">{it.metric}</b> {it.desc}</p></div>
                  <span className="when">{it.when}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROOF */}
        <section className="block" id="proof">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="marker">04</span>
              <div><div className="lab">{c.proof.lab}</div><h2>{c.proof.h2}</h2></div>
            </div>
            <div className="proof-grid">
              {["5.152", "99.25%", "7", "83%", "860/990", "6"].map((big, i) => (
                <div className="metric reveal" key={i}><div className="big">{big}</div><div className="desc">{c.proof.desc[i]}</div></div>
              ))}
            </div>
          </div>
        </section>

        {/* SIGNALS OUT */}
        <section className="block" id="signals">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="marker">05</span>
              <div><div className="lab">{c.signals.lab}</div><h2>{c.signals.h2}</h2></div>
            </div>
            <div className="out-grid">
              <a className="out reveal" href={PAPER} target="_blank" rel="noopener noreferrer">
                <div className="tag">{c.signals.paper.tag}</div>
                <h3>{c.signals.paper.title}</h3>
                <p>{c.signals.paper.desc}</p>
                <div className="chips"><span className="chip">Influence functions</span><span className="chip">Label noise</span><span className="chip">Classification</span></div>
              </a>
              <a className="out reveal" href={GITHUB} target="_blank" rel="noopener noreferrer">
                <div className="tag">{c.signals.github.tag}</div>
                <h3>{c.signals.github.title}</h3>
                <p>{c.signals.github.desc}</p>
                <div className="chips"><span className="chip">LangChain</span><span className="chip">FAISS</span><span className="chip">RoBERTa</span></div>
              </a>
              <div className="out reveal">
                <div className="tag">{c.signals.certs.tag}</div>
                <h3>{c.signals.certs.title}</h3>
                <p>{c.signals.certs.desc}</p>
              </div>
              <div className="out reveal">
                <div className="tag">{c.signals.education.tag}</div>
                <h3>{c.signals.education.title}</h3>
                <p>{c.signals.education.desc}</p>
              </div>
            </div>
          </div>
        </section>

        {/* TALK */}
        <section className="block cta-block" id="talk">
          <div className="wrap">
            <span className="eyebrow" style={{ justifyContent: "center" }}>{c.talk.eyebrow}</span>
            <h2>{c.talk.h2pre}<span className="glow">{c.talk.h2em}</span>.</h2>
            <p className="lede">{c.talk.lede}</p>
            <div className="contact">
              <Link className="btn btn-primary" to="/chat">{c.talk.open} <span className="arr">→</span></Link>
              <a className="btn btn-ghost" href="mailto:mohamedboukrani7@gmail.com">mohamedboukrani7@gmail.com</a>
              <a className="btn btn-ghost" href={LINKEDIN} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a className="btn btn-ghost" href={GITHUB} target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap foot-inner">
          <span>{c.footer.left}</span>
          <span className="baraka">{c.footer.baraka}</span>
        </div>
      </footer>
    </div>
  );
}
