/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from './Components/NavBar';
import { getAuthenticated } from './utils/auth';

// ─── Particle Background ──────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    const PARTICLE_COUNT = 70;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        color: Math.random() > 0.5 ? '#F5A623' : '#8B5CF6',
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = ((120 - dist) / 120) * 0.12;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="particle-canvas"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// ─── Typewriter Hero Text ─────────────────────────────────────────────────────
function TypewriterHero() {
  const words = ['Upload.', 'Analyze.', 'Grow.'];
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    const current = words[wordIdx];
    let timeout;

    if (!isDeleting) {
      if (charIdx < current.length) {
        timeout = setTimeout(() => {
          setDisplayed(prev => prev + current[charIdx]);
          setCharIdx(c => c + 1);
        }, 85);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 1400);
      }
    } else {
      if (charIdx > 0) {
        timeout = setTimeout(() => {
          setDisplayed(prev => prev.slice(0, -1));
          setCharIdx(c => c - 1);
        }, 45);
      } else {
        setIsDeleting(false);
        setWordIdx(i => (i + 1) % words.length);
      }
    }
    return () => clearTimeout(timeout);
  }, [charIdx, isDeleting, wordIdx]);

  const wordColors = ['text-amber-400', 'text-violet-400', 'text-emerald-400'];

  return (
    <span className={`font-mono ${wordColors[wordIdx]} transition-colors duration-300`}>
      {displayed}
      <span className="animate-blink">|</span>
    </span>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, delay }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="glass-card-hover p-6 flex flex-col items-center text-center"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
        style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(245,166,35,0.3)' }}
      >
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
function App() {
  const navigate = useNavigate();
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleGetStarted = () => {
    const isAuth = getAuthenticated();
    navigate(isAuth ? '/analyze' : '/signin');
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    {
      icon: '🧠',
      title: 'Smart Parsing',
      desc: 'AI-powered PDF extraction accurately identifies skills from resumes and job descriptions.',
    },
    {
      icon: '📊',
      title: 'Gap Analysis',
      desc: 'Instantly visualize which skills you have, what\'s missing, and how to close the gap.',
    },
    {
      icon: '🚀',
      title: 'Learning Path',
      desc: 'Personalized, step-by-step roadmaps with curated resources to upskill efficiently.',
    },
  ];

  return (
    <div className="relative min-h-screen bg-mesh overflow-x-hidden">
      <ParticleCanvas />
      <div className="relative z-10 flex flex-col min-h-screen">
        <NavBar />

        {/* ── Hero Section ─────────────────────────────────────────────── */}
        <section className="flex-grow flex flex-col items-center justify-center px-4 py-20 text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{
              background: 'rgba(245,166,35,0.1)',
              border: '1px solid rgba(245,166,35,0.3)',
              color: '#F5A623',
              opacity: heroVisible ? 1 : 0,
              transition: 'opacity 0.6s ease-out 0.1s',
            }}
          >
            <span>✦</span> AI-Adaptive Onboarding Engine <span>✦</span>
          </div>

          {/* Main Headline */}
          <h1
            className="text-6xl md:text-8xl font-extrabold font-sans mb-4 leading-tight"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.7s ease-out 0.2s, transform 0.7s ease-out 0.2s',
            }}
          >
            <span className="gold-gradient-text">AdaptIQ</span>
          </h1>

          {/* Typewriter */}
          <div
            className="text-5xl md:text-6xl font-bold font-mono mb-6 h-16"
            style={{
              opacity: heroVisible ? 1 : 0,
              transition: 'opacity 0.7s ease-out 0.4s',
            }}
          >
            <TypewriterHero />
          </div>

          {/* Value Proposition */}
          <p
            className="text-base md:text-lg text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.7s ease-out 0.6s, transform 0.7s ease-out 0.6s',
            }}
          >
            Upload your resume & a job description. AdaptIQ's AI pinpoints your skill gaps
            and builds a personalized learning roadmap — in seconds.
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 items-center justify-center"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.7s ease-out 0.8s, transform 0.7s ease-out 0.8s',
            }}
          >
            <button
              onClick={handleGetStarted}
              className="btn-primary text-lg font-bold animate-pulse-glow"
            >
              Get Started Free →
            </button>
            <button
              onClick={scrollToFeatures}
              className="btn-ghost text-sm"
            >
              See How It Works ↓
            </button>
          </div>

          {/* Scroll Indicator */}
          <div
            className="mt-16 animate-float"
            style={{
              opacity: heroVisible ? 0.5 : 0,
              transition: 'opacity 0.7s ease-out 1.2s',
            }}
          >
            <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="22" height="34" rx="11" stroke="rgba(245,166,35,0.5)" strokeWidth="1.5"/>
              <rect x="11" y="8" width="2" height="8" rx="1" fill="#F5A623" className="animate-bounce"/>
            </svg>
          </div>
        </section>

        {/* ── Features Section ──────────────────────────────────────────── */}
        <section id="features" className="px-4 pb-24 max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              How <span className="gold-gradient-text">AdaptIQ</span> Works
            </h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Three powerful steps from confusion to clarity — powered by AI.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 150} />
            ))}
          </div>

          {/* Stats row */}
          <div
            className="mt-16 glass-card p-8 grid grid-cols-3 gap-8 text-center"
          >
            {[
              { label: 'Avg. Match Boost', value: '34%', icon: '📈' },
              { label: 'Skills Identified', value: '500+', icon: '🎯' },
              { label: 'Learning Resources', value: '1K+', icon: '📚' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-3xl mb-1">{stat.icon}</div>
                <div className="text-3xl font-extrabold gold-gradient-text">{stat.value}</div>
                <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
