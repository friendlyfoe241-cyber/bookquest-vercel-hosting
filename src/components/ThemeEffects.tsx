import { useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';

// ─── Theme configs ────────────────────────────────────────────────────────────

interface ThemeConfig {
  particleCount: number;
  render: (ctx: CanvasRenderingContext2D, p: Particle, t: number) => void;
  update: (p: Particle, W: number, H: number) => void;
  init: (W: number, H: number, i: number) => Particle;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; alpha: number;
  hue: number; phase: number;
  life: number; maxLife: number;
  data: Record<string, number>;
}

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

// ── Ocean Breeze: soft blue bubbles rising ────────────────────────────────────
const OCEAN: ThemeConfig = {
  particleCount: 22,
  init: (W, H) => ({
    x: rand(0, W), y: rand(H * 0.3, H + 40),
    vx: rand(-0.3, 0.3), vy: rand(-0.4, -0.9),
    size: rand(4, 14), alpha: rand(0.08, 0.22),
    hue: rand(195, 220), phase: rand(0, Math.PI * 2),
    life: 0, maxLife: rand(180, 340), data: {},
  }),
  update(p, W, H) {
    p.phase += 0.02;
    p.x += p.vx + Math.sin(p.phase) * 0.4;
    p.y += p.vy;
    p.life++;
    if (p.y < -20 || p.life > p.maxLife) {
      Object.assign(p, OCEAN.init(W, H, 0));
      p.y = H + 20;
    }
  },
  render(ctx, p) {
    ctx.save();
    ctx.globalAlpha = p.alpha * Math.sin((p.life / p.maxLife) * Math.PI);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(p.x - p.size * 0.3, p.y - p.size * 0.3, 0, p.x, p.y, p.size);
    g.addColorStop(0, `hsla(${p.hue}, 80%, 85%, 0.9)`);
    g.addColorStop(0.6, `hsla(${p.hue}, 70%, 65%, 0.3)`);
    g.addColorStop(1, `hsla(${p.hue}, 60%, 50%, 0)`);
    ctx.fillStyle = g;
    ctx.fill();
    // rim highlight
    ctx.strokeStyle = `hsla(${p.hue}, 80%, 90%, 0.4)`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  },
};

// ── Forest Glow: falling leaves ───────────────────────────────────────────────
const FOREST: ThemeConfig = {
  particleCount: 18,
  init: (W, _H, i) => ({
    x: rand(0, W), y: rand(-60, -10),
    vx: rand(-0.4, 0.4), vy: rand(0.5, 1.2),
    size: rand(6, 13), alpha: rand(0.15, 0.35),
    hue: rand(90, 155), phase: rand(0, Math.PI * 2),
    life: 0, maxLife: rand(220, 400),
    data: { rot: rand(0, Math.PI * 2), rotSpeed: rand(-0.03, 0.03), type: Math.floor(i % 3) },
  }),
  update(p, W, H) {
    p.phase += 0.025;
    p.x += p.vx + Math.sin(p.phase) * 0.7;
    p.y += p.vy;
    p.data.rot += p.data.rotSpeed;
    p.life++;
    if (p.y > H + 30 || p.life > p.maxLife) {
      Object.assign(p, FOREST.init(W, H, p.data.type));
    }
  },
  render(ctx, p) {
    ctx.save();
    ctx.globalAlpha = p.alpha * Math.min(1, p.life / 30);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.data.rot);
    // Draw a simple leaf shape
    ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.6, p.size * 0.8, p.size * 0.6, 0, p.size);
    ctx.bezierCurveTo(-p.size * 0.8, p.size * 0.6, -p.size * 0.8, -p.size * 0.6, 0, -p.size);
    const sat = p.data.type === 0 ? 60 : p.data.type === 1 ? 70 : 50;
    const lit = p.data.type === 0 ? 38 : p.data.type === 1 ? 48 : 55;
    ctx.fillStyle = `hsla(${p.hue}, ${sat}%, ${lit}%, 0.85)`;
    ctx.fill();
    // Midrib
    ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.lineTo(0, p.size);
    ctx.strokeStyle = `hsla(${p.hue}, 55%, 25%, 0.4)`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();
  },
};

// ── Sunset Fire: glowing embers rising ───────────────────────────────────────
const SUNSET: ThemeConfig = {
  particleCount: 28,
  init: (W, H) => ({
    x: rand(0, W), y: rand(H * 0.6, H + 20),
    vx: rand(-0.5, 0.5), vy: rand(-0.6, -1.4),
    size: rand(2, 7), alpha: rand(0.2, 0.5),
    hue: rand(5, 40), phase: rand(0, Math.PI * 2),
    life: 0, maxLife: rand(100, 220), data: {},
  }),
  update(p, W, H) {
    p.phase += 0.04;
    p.x += p.vx + Math.sin(p.phase) * 0.6;
    p.y += p.vy;
    p.life++;
    p.size *= 0.994;
    if (p.y < -10 || p.size < 0.5 || p.life > p.maxLife) {
      Object.assign(p, SUNSET.init(W, H, 0));
    }
  },
  render(ctx, p) {
    const fade = Math.sin((p.life / p.maxLife) * Math.PI);
    ctx.save();
    ctx.globalAlpha = p.alpha * fade;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
    g.addColorStop(0, `hsla(${p.hue + 20}, 100%, 90%, 1)`);
    g.addColorStop(0.4, `hsla(${p.hue}, 95%, 65%, 0.8)`);
    g.addColorStop(1, `hsla(${p.hue - 5}, 80%, 45%, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};

// ── Midnight Stars: twinkling stars ──────────────────────────────────────────
const MIDNIGHT: ThemeConfig = {
  particleCount: 40,
  init: (W, H) => ({
    x: rand(0, W), y: rand(0, H * 0.85),
    vx: 0, vy: 0,
    size: rand(1, 4), alpha: rand(0.1, 0.7),
    hue: rand(230, 290), phase: rand(0, Math.PI * 2),
    life: 0, maxLife: rand(120, 300),
    data: { baseAlpha: rand(0.1, 0.7), twinkleSpeed: rand(0.02, 0.06) },
  }),
  update(p, W, H) {
    p.phase += p.data.twinkleSpeed;
    p.alpha = p.data.baseAlpha * (0.4 + 0.6 * Math.abs(Math.sin(p.phase)));
    p.life++;
    if (p.life > p.maxLife) {
      const np = MIDNIGHT.init(W, H, 0);
      Object.assign(p, np);
    }
  },
  render(ctx, p) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    // Draw a 4-pointed star
    const s = p.size;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? s : s * 0.4;
      const angle = (i * Math.PI) / 4;
      if (i === 0) ctx.moveTo(p.x + r * Math.cos(angle), p.y + r * Math.sin(angle));
      else ctx.lineTo(p.x + r * Math.cos(angle), p.y + r * Math.sin(angle));
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 2);
    g.addColorStop(0, `hsla(${p.hue}, 60%, 95%, 1)`);
    g.addColorStop(0.5, `hsla(${p.hue}, 70%, 75%, 0.5)`);
    g.addColorStop(1, `hsla(${p.hue}, 70%, 60%, 0)`);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  },
};

// ── Royal Gold: glittering sparkles ──────────────────────────────────────────
const GOLD: ThemeConfig = {
  particleCount: 24,
  init: (W, H) => ({
    x: rand(0, W), y: rand(0, H),
    vx: rand(-0.2, 0.2), vy: rand(-0.3, 0.3),
    size: rand(2, 8), alpha: rand(0.1, 0.5),
    hue: rand(38, 52), phase: rand(0, Math.PI * 2),
    life: 0, maxLife: rand(100, 260),
    data: { baseAlpha: rand(0.1, 0.5), rotSpeed: rand(-0.05, 0.05), rot: rand(0, Math.PI) },
  }),
  update(p, W, H) {
    p.phase += 0.045;
    p.x += p.vx + Math.sin(p.phase * 0.7) * 0.2;
    p.y += p.vy + Math.cos(p.phase * 0.5) * 0.2;
    p.data.rot += p.data.rotSpeed;
    p.alpha = p.data.baseAlpha * Math.abs(Math.sin(p.phase));
    p.life++;
    if (p.life > p.maxLife || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) {
      Object.assign(p, GOLD.init(W, H, 0));
    }
  },
  render(ctx, p) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.data.rot);
    // 4-pointed diamond sparkle
    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.6);
    ctx.lineTo(s * 0.4, -s * 0.4);
    ctx.lineTo(s * 1.6, 0);
    ctx.lineTo(s * 0.4, s * 0.4);
    ctx.lineTo(0, s * 1.6);
    ctx.lineTo(-s * 0.4, s * 0.4);
    ctx.lineTo(-s * 1.6, 0);
    ctx.lineTo(-s * 0.4, -s * 0.4);
    ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.6);
    g.addColorStop(0, `hsla(${p.hue}, 100%, 97%, 1)`);
    g.addColorStop(0.4, `hsla(${p.hue}, 95%, 72%, 0.9)`);
    g.addColorStop(1, `hsla(${p.hue - 5}, 80%, 50%, 0)`);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  },
};

const THEME_MAP: Record<string, ThemeConfig> = {
  'ocean-breeze': OCEAN,
  'forest-glow': FOREST,
  'sunset-fire': SUNSET,
  'midnight-stars': MIDNIGHT,
  'royal-gold': GOLD,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ThemeEffects() {
  const { settings } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particles = useRef<Particle[]>([]);
  const themeKey = settings.activeTheme ?? null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const config = themeKey ? THEME_MAP[themeKey] : null;
    if (!config) {
      canvas.style.display = 'none';
      cancelAnimationFrame(rafRef.current);
      return;
    }

    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d')!;
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // Init particles
    particles.current = Array.from({ length: config.particleCount }, (_, i) => config.init(W, H, i));
    // Scatter initial y positions so they don't all start together
    if (themeKey === 'ocean-breeze') {
      particles.current.forEach(p => { p.y = rand(0, H); });
    }

    let frame = 0;
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, W, H);
      frame++;
      particles.current.forEach(p => {
        config.update(p, W, H);
        config.render(ctx, p, frame);
      });
    };
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [themeKey]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        display: themeKey ? 'block' : 'none',
      }}
    />
  );
}
