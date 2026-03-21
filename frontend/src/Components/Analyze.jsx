/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import NavBar from './NavBar';
import { api } from '../utils/api';
import SkillDependencyGraph from './SkillDependencyGraph';
import DiagnosticQuiz from './DiagnosticQuiz';

// ─── Circular Progress Ring ────────────────────────────────────────────────────
function CircularRing({ value, max = 100, size = 120, strokeWidth = 10, color, label, icon }) {
  const [animated, setAnimated] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / max) * circumference;

  useEffect(() => {
    const t = setTimeout(() => {
      let start = null;
      const duration = 1400;
      const step = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        setAnimated(Math.round(ease * value));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 300);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs">{icon}</span>
          <span className="text-xl font-extrabold text-white leading-none">
            {animated}{typeof max === 'number' && max === 100 ? '%' : ''}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-400">{label}</span>
    </div>
  );
}

// ─── Drop Zone ─────────────────────────────────────────────────────────────────
function DropZone({ label, icon, file, onFile, accept = '.pdf,.doc,.docx' }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`drop-zone rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
        dragOver ? 'drag-over' : ''
      } ${file ? 'has-file' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
      {file ? (
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{ background: 'rgba(0,229,160,0.15)' }}
          >
            ✅
          </div>
          <div>
            <p className="text-sm font-semibold text-white truncate max-w-[200px]">{file.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatSize(file.size)}</p>
          </div>
          <span className="tag-success">Ready</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)' }}
          >
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs text-gray-500 mt-1">
              Drop here or <span className="text-amber-400 underline">browse</span>
            </p>
            <p className="text-xs text-gray-600 mt-0.5">PDF, DOC, DOCX supported</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skill Gap Bar ─────────────────────────────────────────────────────────────
function SkillBar({ skill, type, delay = 0 }) {
  const [width, setWidth] = useState(0);

  const config = {
    match:   { color: '#00E5A0', bg: 'rgba(0,229,160,0.1)',   label: 'Match',   pct: 100 },
    gap:     { color: '#FF4D6D', bg: 'rgba(255,77,109,0.1)',  label: 'Gap',     pct: 100 },
    partial: { color: '#F5A623', bg: 'rgba(245,166,35,0.1)',  label: 'Partial', pct: 60  },
  }[type];

  useEffect(() => {
    const t = setTimeout(() => setWidth(config.pct), delay + 200);
    return () => clearTimeout(t);
  }, [config.pct, delay]);

  return (
    <div
      className="group flex items-center gap-3 py-2 px-3 rounded-xl transition-all duration-200 hover:bg-white/5"
      data-tooltip={`${config.label}: ${skill}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-200 truncate">{skill}</span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0`}
            style={{ background: config.bg, color: config.color, border: `1px solid ${config.color}40` }}
          >
            {config.label}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${width}%`,
              background: `linear-gradient(90deg, ${config.color}90, ${config.color})`,
              boxShadow: `0 0 8px ${config.color}60`,
              transitionDelay: `${delay}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Skill Checkbox ────────────────────────────────────────────────────────────
function SkillCheckbox({ skill, completed, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/5 group"
    >
      <div
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
          completed
            ? 'bg-amber-400 border-amber-400'
            : 'border-gray-600 group-hover:border-amber-400/50'
        }`}
      >
        {completed && (
          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-sm ${completed ? 'line-through text-gray-600' : 'text-gray-300'}`}>
        {skill}
      </span>
    </div>
  );
}

// ─── Loading Overlay ───────────────────────────────────────────────────────────
function LoadingOverlay({ progress }) {
  return (
    <>
      {/* Top progress bar */}
      <div
        id="top-progress-bar"
        style={{ width: `${progress}%` }}
      />
      {/* Center overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(10,10,26,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="glass-card p-8 text-center max-w-sm w-full mx-4">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <svg className="w-20 h-20 animate-spin-slow" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(245,166,35,0.15)" strokeWidth="4" />
              <circle
                cx="40" cy="40" r="35"
                fill="none"
                stroke="url(#spinGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="220"
                strokeDashoffset="110"
              />
              <defs>
                <linearGradient id="spinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F5A623" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Analyzing Skills</h3>
          <p className="text-sm text-gray-400 mb-4">AI is reading your documents and mapping skill gaps...</p>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #F5A623, #FFD700)' }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{progress}% complete</p>
        </div>
      </div>
    </>
  );
}

// ─── AI Reasoning Panel ────────────────────────────────────────────────────────
function ReasoningPanel({ analysisResult }) {
  const [open, setOpen] = useState(false);

  if (!analysisResult) return null;

  const trace = analysisResult.skill_gap_trace?.items || [];
  const traceVersion = analysisResult.skill_gap_trace?.version || 'legacy';

  const traceLines = [];
  if (trace.length > 0) {
    traceLines.push({ prompt: '$', text: `skill-gap-trace v${traceVersion} | gaps=${trace.length}` });
    traceLines.push({ prompt: '$', text: `resume_skills=${analysisResult.skills_from_resume?.length || 0} | jd_skills=${analysisResult.skills_required_in_job?.length || 0}` });
    traceLines.push({ prompt: '$', text: '---' });

    trace.forEach((item) => {
      const step = String(item.step ?? '').padStart(2, '0') || '--';
      const jdPhrase = item.jd_phrase?.trim()
        ? `"${item.jd_phrase.trim()}"`
        : '(no exact JD phrase found; inferred from context)';
      const matchType = item.match_type ? ` (${item.match_type})` : '';

      traceLines.push({ prompt: `[${step}]`, text: `GAP: ${item.skill}${matchType}` });
      traceLines.push({ prompt: 'jd>', text: jdPhrase });
      traceLines.push({ prompt: 'why>', text: item.reason || 'Present in job description but not detected in resume.' });
      traceLines.push({ prompt: '', text: '' });
    });
  }

  const lines = [
    { type: 'info',    text: 'Parsing resume PDF... extracted text layer ✓' },
    { type: 'info',    text: 'Parsing job description PDF... extracted text layer ✓' },
    { type: 'process', text: `Identified ${analysisResult.skills_from_resume?.length || 0} skills from your resume.` },
    { type: 'process', text: `Job requires ${analysisResult.skills_required_in_job?.length || 0} distinct skills.` },
    { type: 'match',   text: `Matched ${analysisResult.matching_skills?.length || 0} skills (present in both documents).` },
    { type: 'gap',     text: `Identified ${analysisResult.skills_to_improve?.length || 0} skill gaps requiring attention.` },
    ...(analysisResult.skills_to_improve || []).map(s => ({
      type: 'gap-item',
      text: `  └─ "${s}" — found in job description, not detected in resume.`,
    })),
    { type: 'success', text: 'Learning pathway generated. Personalized roadmap ready.' },
  ];

  const colors = {
    info:     '#8B9CF4',
    process:  '#F5A623',
    match:    '#00E5A0',
    gap:      '#FF4D6D',
    'gap-item': '#FF8FA0',
    success:  '#00E5A0',
  };

  const prompts = {
    info:     '→',
    process:  '◈',
    match:    '✓',
    gap:      '✗',
    'gap-item': ' ',
    success:  '★',
  };

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono font-semibold" style={{ color: '#00E5A0' }}>
            &gt; Skill Gap Reasoning Trace
          </span>
          <span className="tag-success text-xs">Beta</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className={`accordion-content ${open ? 'open' : ''}`}>
        <div className="terminal-log mx-4 mb-4 p-4 text-xs" style={{ maxHeight: 280, overflowY: 'auto' }}>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-amber-400/70" />
            <div className="w-3 h-3 rounded-full bg-green-400/70" />
            <span className="ml-2 font-mono text-gray-500 text-xs">adaptiq-trace</span>
          </div>
          {(traceLines.length ? traceLines : lines).map((line, i) => (
            <div
              key={i}
              className="terminal-line"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="terminal-prompt" style={{ minWidth: 44 }}>
                {line.prompt ?? prompts[line.type]}
              </span>
              <span className="terminal-text">
                {line.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Learning Pathway ──────────────────────────────────────────────────────────
function LearningPathway({
  skills,
  analysisResult,
  onGetResource,
  onFetchResourceLink,
  loadingSkills,
  onMarkCompleteByName,
}) {
  const [view, setView] = useState('list');
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  if (!skills || skills.length === 0) return null;

  const difficulties = ['Beginner', 'Intermediate', 'Advanced'];
  const diffColors  = ['#00E5A0', '#F5A623', '#FF4D6D'];
  const hours = [8, 12, 20, 10, 15, 6, 18, 9, 14, 11];

  const totalHours = skills.reduce((acc, _, i) => acc + hours[i % hours.length], 0);

  return (
    <div className="space-y-4">
      <div ref={ref} className="glass-card overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              🗺️ Learning Roadmap
            </h3>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex items-center gap-2 mr-2">
                <span className="text-xs text-gray-400">Total:</span>
                <span className="text-sm font-bold text-amber-400">~{totalHours} hours</span>
              </div>
              <div
                className="inline-flex items-center gap-1 p-1 rounded-2xl border"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
                  style={{
                    background: view === 'list' ? 'rgba(245,166,35,0.16)' : 'transparent',
                    color: view === 'list' ? '#F5A623' : '#94A3B8',
                  }}
                >
                  List View
                </button>
                <button
                  type="button"
                  onClick={() => setView('graph')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
                  style={{
                    background: view === 'graph' ? 'rgba(245,166,35,0.16)' : 'transparent',
                    color: view === 'graph' ? '#F5A623' : '#94A3B8',
                  }}
                >
                  Graph View
                </button>
              </div>
            </div>
          </div>
        </div>

        {view === 'list' ? (
          <div className="p-5 relative">
            {/* Vertical line */}
            <div
              className="absolute left-9 top-5 bottom-5 w-0.5"
              style={{ background: 'linear-gradient(to bottom, rgba(245,166,35,0.5), rgba(0,229,160,0.3))' }}
            />

            <div className="space-y-4">
              {skills.map((skill, i) => {
                const diff = difficulties[i % 3];
                const diffColor = diffColors[i % 3];
                const hrs = hours[i % hours.length];

                return (
                  <div
                    key={skill.id}
                    className="flex gap-4"
                    style={{
                      opacity: visible ? 1 : 0,
                      transform: visible ? 'translateX(0)' : 'translateX(-20px)',
                      transition: `opacity 0.5s ease-out ${i * 80}ms, transform 0.5s ease-out ${i * 80}ms`,
                    }}
                  >
                    {/* Step number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-black z-10"
                      style={{ background: skill.completed ? '#00E5A0' : 'linear-gradient(135deg, #F5A623, #FFD700)', borderColor: skill.completed ? '#00E5A0' : '#F5A623' }}
                    >
                      {skill.completed ? '✓' : i + 1}
                    </div>

                    {/* Card */}
                    <div
                      className="flex-1 rounded-xl p-4 border transition-all duration-200 hover:border-amber-400/30"
                      style={{
                        background: skill.completed ? 'rgba(0,229,160,0.05)' : 'rgba(255,255,255,0.04)',
                        borderColor: skill.completed ? 'rgba(0,229,160,0.2)' : 'rgba(255,255,255,0.07)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${skill.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                            {skill.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs text-gray-400">⏱ ~{hrs} hrs</span>
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: `${diffColor}18`,
                                color: diffColor,
                                border: `1px solid ${diffColor}35`,
                              }}
                            >
                              {diff}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => onGetResource(e, skill.name)}
                          disabled={loadingSkills[skill.name]}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5"
                          style={{
                            background: loadingSkills[skill.name] ? 'rgba(255,255,255,0.05)' : 'rgba(245,166,35,0.15)',
                            color: '#F5A623',
                            border: '1px solid rgba(245,166,35,0.3)',
                          }}
                        >
                          {loadingSkills[skill.name] ? (
                            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : '📚'} Resource
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-5">
            <p className="text-sm text-gray-400">
              Graph View visualizes dependencies, unlocks, and the recommended sequence for the Adaptive Pathing Algorithm.
            </p>
          </div>
        )}
      </div>

      {view === 'graph' ? (
        <SkillDependencyGraph
          analysisResult={analysisResult}
          skills={skills}
          onMarkCompleteByName={onMarkCompleteByName}
          onOpenResource={onFetchResourceLink}
        />
      ) : null}
    </div>
  );
}

// ─── Skill Gap Score Badge ─────────────────────────────────────────────────────
function GapScoreBadge({ matchRate }) {
  const getGrade = (rate) => {
    if (rate >= 80) return { emoji: '🚀', label: 'Strong Match', color: '#00E5A0' };
    if (rate >= 60) return { emoji: '🔥', label: 'Good Match',   color: '#F5A623' };
    if (rate >= 40) return { emoji: '📈', label: 'Developing',   color: '#F5A623' };
    return { emoji: '⚡', label: 'Needs Work', color: '#FF4D6D' };
  };
  const grade = getGrade(matchRate);

  return (
    <div
      className="flex items-center gap-3 px-5 py-3 rounded-2xl"
      style={{
        background: `${grade.color}15`,
        border: `1px solid ${grade.color}35`,
      }}
    >
      <span className="text-2xl">{grade.emoji}</span>
      <div>
        <p className="text-xs text-gray-400">Skill Gap Score</p>
        <p className="font-bold text-sm" style={{ color: grade.color }}>{grade.label}</p>
      </div>
      <div
        className="ml-auto text-2xl font-extrabold"
        style={{ color: grade.color }}
      >
        {matchRate}%
      </div>
    </div>
  );
}

// ─── Mode Picker Cards ─────────────────────────────────────────────────────────
function ModePickerCard({ icon, title, desc, badge, color, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex-1 flex flex-col items-center text-center p-6 md:p-8 rounded-2xl border transition-all duration-300"
      style={{
        background: hovered ? `${color}0d` : 'rgba(255,255,255,0.03)',
        borderColor: hovered ? `${color}60` : 'rgba(255,255,255,0.09)',
        boxShadow: hovered ? `0 8px 32px ${color}20` : 'none',
        transform: hovered ? 'translateY(-3px)' : 'none',
        cursor: 'pointer',
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        {icon}
      </div>
      {badge && (
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full mb-3"
          style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
        >
          {badge}
        </span>
      )}
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
      <div
        className="mt-5 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200"
        style={{ background: `${color}18`, color }}
      >
        Select →
      </div>
    </button>
  );
}

// ─── Main Analyze Component ────────────────────────────────────────────────────
function Analyze() {
  const [inputMode, setInputMode] = useState(null); // null | 'resume' | 'quiz'
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [matchRate, setMatchRate] = useState(0);
  const [marketFit, setMarketFit] = useState(0);
  const [skillsToImprove, setSkillsToImprove] = useState(0);
  const [skills, setSkills] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState({});
  const [toast, setToast] = useState({ visible: false, leaving: false, message: '' });
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef(null);

  const fireStrongMatchCelebration = useCallback(() => {
    const confettiFn = window?.confetti;
    if (typeof confettiFn === 'function') {
      const colors = ['#F5A623', '#7C3AED'];
      confettiFn({ particleCount: 90, spread: 75, startVelocity: 40, origin: { x: 0.82, y: 0.18 }, colors });
      confettiFn({ particleCount: 60, spread: 60, startVelocity: 34, origin: { x: 0.9, y: 0.2 }, colors });
      setTimeout(() => confettiFn({ particleCount: 70, spread: 85, startVelocity: 42, origin: { x: 0.86, y: 0.22 }, colors }), 220);
    }

    setToast({ visible: true, leaving: false, message: "🎉 Strong Match! You're well-suited for this role" });
    setTimeout(() => setToast((t) => (t.visible ? { ...t, leaving: true } : t)), 3800);
    setTimeout(() => setToast({ visible: false, leaving: false, message: '' }), 4000);
  }, []);

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      
      const formatName = (f) => f ? f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ') : '';
      const candName = formatName(resume) || 'Candidate Profile';
      let roleName = formatName(jobDescription).replace(/jd|job|description/gi, '').trim();
      if (!roleName) roleName = 'Target Role';

      const { generatePDFReport } = await import('../utils/generateReport');
      await generatePDFReport({
        candidateName: candName,
        targetRole: roleName, 
        matchRate,
        marketFit,
        skillsToGrow: skillsToImprove,
        skills,
        analysisResult
      });
      setToast({ visible: true, leaving: false, message: "📄 Report exported successfully!" });
      setTimeout(() => setToast((t) => (t.visible ? { ...t, leaving: true } : t)), 2800);
      setTimeout(() => setToast({ visible: false, leaving: false, message: '' }), 3000);
    } catch (error) {
      console.error('Export failed', error);
      const errMsg = error?.message || String(error);
      setToast({ visible: true, leaving: false, message: `⚠️ Export failed: ${errMsg}` });
      setTimeout(() => setToast((t) => (t.visible ? { ...t, leaving: true } : t)), 4800);
      setTimeout(() => setToast({ visible: false, leaving: false, message: '' }), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = () => {
    const text = `I just analyzed my resume on AdaptIQ and got a ${matchRate}% Match Rate with ${marketFit}/100 Market Fit!\n\nI have to learn ${skillsToImprove} key skills. Time to level up! 🚀`;
    navigator.clipboard.writeText(text);
    setToast({ visible: true, leaving: false, message: "📋 Summary copied to clipboard!" });
    setTimeout(() => setToast((t) => (t.visible ? { ...t, leaving: true } : t)), 2800);
    setTimeout(() => setToast({ visible: false, leaving: false, message: '' }), 3000);
  };

  const maybeCelebrateStrongMatch = useCallback((rate, result) => {
    if (!result || typeof rate !== 'number' || rate <= 75) return;
    const key = JSON.stringify({
      r: Math.round(rate),
      req: result.skills_required_in_job?.length || 0,
      gaps: (result.skills_to_improve || []).slice(0, 12),
    });
    const last = localStorage.getItem('celebratedStrongMatchKey');
    if (last === key) return;
    localStorage.setItem('celebratedStrongMatchKey', key);
    fireStrongMatchCelebration();
  }, [fireStrongMatchCelebration]);

  // Load saved data
  useEffect(() => {
    const saved = {
      analysisResult: localStorage.getItem('analysisResult'),
      skills: localStorage.getItem('skills'),
      matchRate: localStorage.getItem('matchRate'),
      marketFit: localStorage.getItem('marketFit'),
      skillsToImprove: localStorage.getItem('skillsToImprove'),
    };
    if (saved.analysisResult) {
      setAnalysisResult(JSON.parse(saved.analysisResult));
      setSkills(JSON.parse(saved.skills || '[]'));
      setMatchRate(JSON.parse(saved.matchRate || '0'));
      setMarketFit(JSON.parse(saved.marketFit || '0'));
      setSkillsToImprove(JSON.parse(saved.skillsToImprove || '0'));
    }
  }, []);

  useEffect(() => {
    if (analysisResult && matchRate > 75) {
      maybeCelebrateStrongMatch(matchRate, analysisResult);
    }
  }, [analysisResult, matchRate, maybeCelebrateStrongMatch]);

  // Fake progress bar during loading
  useEffect(() => {
    if (!isLoading) { setLoadingProgress(0); return; }
    setLoadingProgress(5);
    const milestones = [15, 35, 55, 70, 82, 90, 95];
    const timers = milestones.map((val, i) =>
      setTimeout(() => setLoadingProgress(val), 400 + i * 700)
    );
    return () => timers.forEach(clearTimeout);
  }, [isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resume || !jobDescription) return;
    setIsLoading(true);
    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('job_description', jobDescription);
    try {
      const response = await api.post('/skill-analyzer', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = response.data;
      setAnalysisResult(result);

      const total = result.skills_required_in_job.length;
      const matched = result.matching_skills.length;
      const toImprove = result.skills_to_improve.length;
      const newMatchRate = Math.round(((matched + 1) / total) * 100);
      const newMarketFit = Math.round(((toImprove + 1) / total) * 100);

      setMatchRate(newMatchRate);
      setMarketFit(newMarketFit);
      setSkillsToImprove(toImprove);
      maybeCelebrateStrongMatch(newMatchRate, result);

      const newSkills = result.skills_to_improve.map((skill, index) => ({
        id: index + 1,
        name: skill,
        completed: false,
      }));
      setSkills(newSkills);
      setLoadingProgress(100);

      localStorage.setItem('analysisResult', JSON.stringify(result));
      localStorage.setItem('skills', JSON.stringify(newSkills));
      localStorage.setItem('matchRate', JSON.stringify(newMatchRate));
      localStorage.setItem('marketFit', JSON.stringify(newMarketFit));
      localStorage.setItem('skillsToImprove', JSON.stringify(toImprove));

      setTimeout(() => {
        dashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 600);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizComplete = useCallback((result) => {
    setAnalysisResult(result);

    const total = result.skills_required_in_job.length || 1;
    const matched = result.matching_skills.length;
    const toImprove = result.skills_to_improve.length;
    const newMatchRate = Math.round((matched / total) * 100);
    const newMarketFit = Math.round(((total - toImprove) / total) * 100);

    setMatchRate(newMatchRate);
    setMarketFit(newMarketFit);
    setSkillsToImprove(toImprove);
    maybeCelebrateStrongMatch(newMatchRate, result);

    const newSkills = result.skills_to_improve.map((skill, index) => ({
      id: index + 1,
      name: skill,
      completed: false,
    }));
    setSkills(newSkills);

    localStorage.setItem('analysisResult', JSON.stringify(result));
    localStorage.setItem('skills', JSON.stringify(newSkills));
    localStorage.setItem('matchRate', JSON.stringify(newMatchRate));
    localStorage.setItem('marketFit', JSON.stringify(newMarketFit));
    localStorage.setItem('skillsToImprove', JSON.stringify(toImprove));

    setTimeout(() => {
      dashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 600);
  }, [maybeCelebrateStrongMatch]);

  const toggleSkill = (id) => {
    const updated = skills.map(s => s.id === id ? { ...s, completed: !s.completed } : s);
    setSkills(updated);
    localStorage.setItem('skills', JSON.stringify(updated));
  };

  const markSkillCompleteByName = (skillName) => {
    const normalizeKey = (v) => (v || '')
      .toLowerCase()
      .replace(/\(.*?\)/g, ' ')
      .replace(/[^a-z0-9+\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const target = normalizeKey(skillName);
    if (!target) return false;
    const idx = skills.findIndex((s) => normalizeKey(s.name) === target);
    if (idx === -1) return false;

    const updated = skills.map((s, i) => (i === idx ? { ...s, completed: true } : s));
    setSkills(updated);
    localStorage.setItem('skills', JSON.stringify(updated));
    return true;
  };

  const fetchResourceLink = async (skillName) => {
    const response = await api.post('/recommend_course', { resource: skillName });
    return response.data?.recommendation || '';
  };

  const openSkillResource = async (e, skillName) => {
    if (e?.preventDefault) e.preventDefault();
    setLoadingSkills(prev => ({ ...prev, [skillName]: true }));
    try {
      const url = await fetchResourceLink(skillName);
      if (url) window.open(url, '_blank');
      return url;
    } catch (error) {
      console.error('Error sending skill:', error);
      return '';
    } finally {
      setLoadingSkills(prev => ({ ...prev, [skillName]: false }));
    }
  };

  const canAnalyze = resume && jobDescription && !isLoading;
  const completedCount = skills.filter(s => s.completed).length;

  return (
    <div className="relative min-h-screen bg-mesh">
      {toast.visible ? (
        <div className={`adaptiq-toast ${toast.leaving ? 'adaptiq-toast-leave' : 'adaptiq-toast-enter'}`}>
          <div className="text-sm font-semibold" style={{ color: '#F5A623' }}>
            {toast.message}
          </div>
        </div>
      ) : null}
      {isLoading && <LoadingOverlay progress={loadingProgress} />}

      <div className="relative z-10 flex flex-col min-h-screen">
        <NavBar />

        <div className="flex-grow px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* ── Upload / Mode Section ──────────────────────────────────── */}
            <div className="glass-card p-6 md:p-8">
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
                  <span className="gold-gradient-text">Skill Analyzer</span>
                </h1>
                <p className="text-gray-400 text-sm max-w-md mx-auto">
                  {inputMode === null
                    ? 'Choose how you want AdaptIQ to assess your skills.'
                    : inputMode === 'resume'
                    ? 'Upload your resume and a job description to identify skill gaps.'
                    : 'Upload a Job Description and take an AI-generated quiz to assess your skills.'}
                </p>
              </div>

              {/* ── Mode picker (no mode selected yet) ─────────────── */}
              {inputMode === null && (
                <div className="flex flex-col md:flex-row gap-5">
                  <ModePickerCard
                    icon="📄"
                    title="Upload Resume"
                    badge="Classic"
                    desc="Upload your resume & a Job Description. AI pinpoints your skill gaps instantly."
                    color="#F5A623"
                    onClick={() => setInputMode('resume')}
                  />
                  <ModePickerCard
                    icon="🧠"
                    title="Take Diagnostic Quiz"
                    badge="New"
                    desc="No resume? Upload only the JD. AdaptIQ quizzes you with 2-3 questions per skill for accurate scoring."
                    color="#8B5CF6"
                    onClick={() => setInputMode('quiz')}
                  />
                </div>
              )}

              {/* ── Resume upload flow ──────────────────────────────── */}
              {inputMode === 'resume' && (
                <>
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <DropZone
                        label="Upload Resume"
                        icon="📄"
                        file={resume}
                        onFile={setResume}
                      />
                      <DropZone
                        label="Upload Job Description"
                        icon="💼"
                        file={jobDescription}
                        onFile={setJobDescription}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!canAnalyze}
                      className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-3 ${
                        canAnalyze ? 'animate-pulse-glow' : ''
                      }`}
                      style={{
                        background: canAnalyze
                          ? 'linear-gradient(135deg, #F5A623, #FFD700)'
                          : 'rgba(255,255,255,0.07)',
                        color: canAnalyze ? '#0A0A1A' : 'rgba(255,255,255,0.3)',
                        cursor: canAnalyze ? 'pointer' : 'not-allowed',
                        boxShadow: canAnalyze ? '0 4px 24px rgba(245,166,35,0.4)' : 'none',
                      }}
                    >
                      {!resume && !jobDescription
                        ? '📁 Upload Both Files to Begin'
                        : !resume
                        ? '📄 Upload Your Resume'
                        : !jobDescription
                        ? '💼 Upload Job Description'
                        : '🔍 Analyze My Skills'}
                    </button>
                  </form>

                  {!analysisResult && (
                    <button
                      onClick={() => setInputMode(null)}
                      className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-white/5"
                      style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      ← Back to Options
                    </button>
                  )}
                </>
              )}

              {/* ── Diagnostic Quiz flow ────────────────────────────── */}
              {inputMode === 'quiz' && (
                <DiagnosticQuiz
                  onBack={() => setInputMode(null)}
                  onComplete={handleQuizComplete}
                />
              )}
            </div>

            {/* ── Analysis Dashboard ─────────────────────────────────────── */}
            {analysisResult && (
              <div ref={dashboardRef} className="space-y-6">
                {/* Stats row */}
                <div className="glass-card p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
                      📊 Analysis Dashboard
                      <span className="tag-success text-sm hidden sm:inline-flex">Complete</span>
                      {analysisResult?.assessed_via_quiz && (
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full hidden sm:inline-flex items-center gap-1"
                          style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.3)' }}
                        >
                          🧠 Assessed via Diagnostic Quiz ✓
                        </span>
                      )}
                    </h2>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleShare}
                        className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border flex items-center gap-2 hover:bg-white/5"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          borderColor: 'rgba(255,255,255,0.1)',
                          color: '#E2E8F0',
                        }}
                      >
                        📤 Share
                      </button>
                      <button
                        type="button"
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border flex items-center gap-2 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20"
                        style={{
                          background: isExporting ? 'rgba(245,166,35,0.05)' : 'rgba(245,166,35,0.15)',
                          borderColor: 'rgba(245,166,35,0.4)',
                          color: '#F5A623',
                        }}
                      >
                        {isExporting ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Generating...
                          </>
                        ) : (
                          '📄 Export PDF Report'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Skill Gap Score Badge */}
                  <GapScoreBadge matchRate={matchRate} />

                  {/* Circular rings */}
                  <div className="flex flex-wrap items-center justify-around gap-8 mt-8">
                    <CircularRing
                      value={matchRate}
                      color="#00E5A0"
                      label="Match Rate"
                      icon="🎯"
                    />
                    <CircularRing
                      value={marketFit}
                      color="#F5A623"
                      label="Market Fit"
                      icon="📈"
                      size={100}
                      strokeWidth={8}
                    />
                    <CircularRing
                      value={skillsToImprove}
                      max={skillsToImprove}
                      color="#FF4D6D"
                      label="Skills to Grow"
                      icon="⚡"
                      size={100}
                      strokeWidth={8}
                    />
                  </div>
                </div>

                {/* Skill Gap Visualization */}
                <div className="glass-card p-6">
                  <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                    🗂️ Skill Gap Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Your Skills */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Your Skills · {analysisResult.skills_from_resume?.length || 0} detected
                      </h4>
                      <div className="space-y-1">
                        {(analysisResult.skills_from_resume || []).map((skill, i) => (
                          <SkillBar
                            key={skill}
                            skill={skill}
                            type={analysisResult.matching_skills?.includes(skill) ? 'match' : 'partial'}
                            delay={i * 60}
                          />
                        ))}
                      </div>
                    </div>
                    {/* Skills to Improve */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Skill Gaps · {analysisResult.skills_to_improve?.length || 0} missing
                      </h4>
                      <div className="space-y-1">
                        {(analysisResult.skills_to_improve || []).map((skill, i) => (
                          <SkillBar
                            key={skill}
                            skill={skill}
                            type="gap"
                            delay={i * 60}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Reasoning Panel */}
                <ReasoningPanel analysisResult={analysisResult} />

                {/* Learning Pathway + Sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <LearningPathway
                      skills={skills}
                      analysisResult={analysisResult}
                      onGetResource={openSkillResource}
                      onFetchResourceLink={fetchResourceLink}
                      loadingSkills={loadingSkills}
                      onMarkCompleteByName={markSkillCompleteByName}
                    />
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-4">
                    {/* Progress tracker */}
                    <div className="glass-card p-5">
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
                        <span>✅ Progress Tracker</span>
                        <span className="text-amber-400 text-xs font-mono">{completedCount}/{skills.length}</span>
                      </h3>

                      {/* Progress bar */}
                      <div className="h-2 rounded-full bg-white/5 mb-4 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: skills.length ? `${(completedCount / skills.length) * 100}%` : '0%',
                            background: 'linear-gradient(90deg, #F5A623, #00E5A0)',
                          }}
                        />
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                        {skills.map((skill) => (
                          <SkillCheckbox
                            key={skill.id}
                            skill={skill.name}
                            completed={skill.completed}
                            onToggle={() => toggleSkill(skill.id)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Study time estimate */}
                    <div className="glass-card p-5">
                      <h3 className="text-sm font-bold text-white mb-3">⏱ Study Estimate</h3>
                      <p className="text-3xl font-extrabold gold-gradient-text">
                        ~{skills.length * 10}h
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {skills.length} skills × ~10 hrs average
                      </p>
                      <div
                        className="mt-4 p-3 rounded-xl text-xs text-gray-400"
                        style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.15)' }}
                      >
                        💡 Tip: Focus on high-demand gaps first for maximum interview impact.
                      </div>
                    </div>

                    {/* Raw skills overview */}
                    <div className="glass-card p-5">
                      <h3 className="text-sm font-bold text-white mb-3">📋 Job Requirements</h3>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                        {(analysisResult.skills_required_in_job || []).map(skill => (
                          <span
                            key={skill}
                            className="text-xs px-2.5 py-1 rounded-full font-medium"
                            data-tooltip={skill}
                            style={{
                              background: analysisResult.matching_skills?.includes(skill)
                                ? 'rgba(0,229,160,0.1)'
                                : 'rgba(255,77,109,0.1)',
                              color: analysisResult.matching_skills?.includes(skill)
                                ? '#00E5A0'
                                : '#FF4D6D',
                              border: `1px solid ${analysisResult.matching_skills?.includes(skill) ? 'rgba(0,229,160,0.25)' : 'rgba(255,77,109,0.25)'}`,
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analyze;
