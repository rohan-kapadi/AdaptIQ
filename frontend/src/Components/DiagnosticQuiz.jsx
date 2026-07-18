/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';

// ─── Difficulty color map ──────────────────────────────────────────────────────
const DIFF_COLORS = {
  Easy:   { bg: 'rgba(0,229,160,0.15)',  color: '#00E5A0', border: 'rgba(0,229,160,0.3)'  },
  Medium: { bg: 'rgba(245,166,35,0.15)', color: '#F5A623', border: 'rgba(245,166,35,0.3)' },
  Hard:   { bg: 'rgba(255,77,109,0.15)', color: '#FF4D6D', border: 'rgba(255,77,109,0.3)' },
};



const TIMER_SECONDS = 30;

// ─── Timer Bar ────────────────────────────────────────────────────────────────
function TimerBar({ key: resetKey, onExpire }) {
  const [width, setWidth] = useState(100);
  const startRef = useRef(null);
  const rafRef   = useRef(null);

  useEffect(() => {
    setWidth(100);
    startRef.current = null;

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = (ts - startRef.current) / 1000;
      const pct = Math.max(0, 100 - (elapsed / TIMER_SECONDS) * 100);
      setWidth(pct);
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        onExpire();
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const color = width > 60 ? '#00E5A0' : width > 30 ? '#F5A623' : '#FF4D6D';

  return (
    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div
        className="h-full rounded-full transition-colors duration-500"
        style={{ width: `${width}%`, background: color, boxShadow: `0 0 8px ${color}60` }}
      />
    </div>
  );
}

// ─── Screen 1: JD Upload ──────────────────────────────────────────────────────
function JDUploadScreen({ onGenerate, onBack }) {
  const [jdFile, setJdFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (f) setJdFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const formatSize = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleGenerate = async () => {
    if (!jdFile) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('job_description', jdFile);
      const res = await api.post('/generate-quiz', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { questions } = res.data;
      if (!questions?.length) throw new Error('No questions returned');
      // Fisher-Yates shuffle so same-skill questions are interleaved
      const shuffled = [...questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      onGenerate(shuffled);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to generate quiz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Header */}
      <div className="text-center">
        <div className="text-5xl mb-3">🧠</div>
        <h2 className="text-2xl font-bold text-white mb-1">Diagnostic Quiz</h2>
        <p className="text-sm text-gray-400 max-w-sm">
          Upload a Job Description and AdaptIQ will generate a personalised quiz to assess your skills — no resume needed.
        </p>
      </div>

      {/* How it works */}
      <div
        className="w-full max-w-md rounded-xl p-4 grid grid-cols-3 gap-3 text-center text-xs"
        style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.15)' }}
      >
        {[
          { icon: '📄', label: 'Upload JD' },
          { icon: '🎯', label: '15–20 Questions' },
          { icon: '📊', label: 'Instant Results' },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1">
            <span className="text-xl">{s.icon}</span>
            <span className="text-gray-400 font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Drop Zone */}
      <div
        className={`w-full max-w-md rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 drop-zone ${dragOver ? 'drag-over' : ''} ${jdFile ? 'has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />
        {jdFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ background: 'rgba(0,229,160,0.15)' }}>✅</div>
            <p className="text-sm font-semibold text-white truncate max-w-[220px]">{jdFile.name}</p>
            <p className="text-xs text-gray-400">{formatSize(jdFile.size)}</p>
            <span className="tag-success">Ready</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)' }}>💼</div>
            <p className="text-sm font-semibold text-white">Upload Job Description</p>
            <p className="text-xs text-gray-500">Drop here or <span className="text-amber-400 underline">browse</span></p>
            <p className="text-xs text-gray-600">PDF, DOC, DOCX supported</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm font-medium" style={{ color: '#FF4D6D' }}>⚠️ {error}</p>
      )}

      <div className="flex flex-col gap-3 w-full max-w-md">
        <button
          onClick={handleGenerate}
          disabled={!jdFile || loading}
          className="w-full py-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2"
          style={{
            background: jdFile && !loading ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : 'rgba(255,255,255,0.07)',
            color: jdFile && !loading ? '#fff' : 'rgba(255,255,255,0.3)',
            cursor: jdFile && !loading ? 'pointer' : 'not-allowed',
            boxShadow: jdFile && !loading ? '0 4px 24px rgba(139,92,246,0.4)' : 'none',
          }}
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating Quiz...
            </>
          ) : (
            '🧠 Generate My Quiz'
          )}
        </button>

        <button
          onClick={onBack}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-white/5"
          style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          ← Back to Upload Options
        </button>
      </div>
    </div>
  );
}

// ─── Screen 2: Quiz ───────────────────────────────────────────────────────────
function QuizScreen({ questions, onComplete }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]); // array of {questionIdx, selectedIdx} or null if timed out
  const [selectedOption, setSelectedOption] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [timerKey, setTimerKey] = useState(0);

  const total = questions.length;
  const current = questions[currentIdx];
  const diffStyle = DIFF_COLORS[current?.difficulty] || DIFF_COLORS.Medium;

  const advance = useCallback((selectedIdx) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    const newAnswers = [...answers, { questionIdx: currentIdx, selectedIdx }];
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentIdx + 1 >= total) {
        onComplete(newAnswers, questions);
      } else {
        setCurrentIdx((i) => i + 1);
        setSelectedOption(null);
        setTimerKey((k) => k + 1);
        setIsTransitioning(false);
      }
    }, 380);
  }, [answers, currentIdx, isTransitioning, onComplete, questions, total]);

  const handleOptionClick = (optIdx) => {
    if (selectedOption !== null || isTransitioning) return;
    setSelectedOption(optIdx);
    setTimeout(() => advance(optIdx), 420);
  };

  const handleTimerExpire = useCallback(() => {
    if (selectedOption !== null || isTransitioning) return;
    advance(null); // null = timed out / skipped
  }, [advance, isTransitioning, selectedOption]);

  return (
    <div
      className="w-full"
      style={{
        opacity: isTransitioning ? 0 : 1,
        transform: isTransitioning ? 'translateX(-40px)' : 'translateX(0)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      {/* Progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400">
            Question <span className="text-white font-bold">{currentIdx + 1}</span> / {total}
          </span>
          <span className="text-xs text-gray-500 font-mono">
            ⏱ {TIMER_SECONDS}s
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${((currentIdx) / total) * 100}%`,
              background: 'linear-gradient(90deg, #8B5CF6, #F5A623)',
            }}
          />
        </div>
        <TimerBar key={timerKey} resetKey={timerKey} onExpire={handleTimerExpire} />
      </div>

      {/* Question Card */}
      <div className="glass-card p-6 mb-5">
        {/* Skill + Difficulty badges */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.3)' }}
          >
            {current.skill}
          </span>
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: diffStyle.bg, color: diffStyle.color, border: `1px solid ${diffStyle.border}` }}
          >
            {current.difficulty}
          </span>
        </div>

        <p className="text-base md:text-lg font-semibold text-white leading-relaxed">
          {current.question}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {current.options.map((opt, idx) => {
          const letter = ['A', 'B', 'C', 'D'][idx];
          const isSelected = selectedOption === idx;
          const isCorrect = selectedOption !== null && idx === current.correct_index;
          const isWrong = isSelected && idx !== current.correct_index;

          let bgColor = 'rgba(255,255,255,0.04)';
          let borderColor = 'rgba(255,255,255,0.09)';
          let textColor = '#CBD5E1';
          let letterBg = 'rgba(255,255,255,0.08)';
          let letterColor = '#94A3B8';

          if (isCorrect && selectedOption !== null) {
            bgColor = 'rgba(0,229,160,0.1)';
            borderColor = 'rgba(0,229,160,0.4)';
            textColor = '#00E5A0';
            letterBg = 'rgba(0,229,160,0.2)';
            letterColor = '#00E5A0';
          } else if (isWrong) {
            bgColor = 'rgba(255,77,109,0.1)';
            borderColor = 'rgba(255,77,109,0.4)';
            textColor = '#FF4D6D';
            letterBg = 'rgba(255,77,109,0.2)';
            letterColor = '#FF4D6D';
          } else if (isSelected) {
            bgColor = 'rgba(139,92,246,0.1)';
            borderColor = 'rgba(139,92,246,0.4)';
            textColor = '#A78BFA';
            letterBg = 'rgba(139,92,246,0.2)';
            letterColor = '#A78BFA';
          }

          return (
            <button
              key={idx}
              onClick={() => handleOptionClick(idx)}
              disabled={selectedOption !== null}
              className="quiz-option w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200"
              style={{
                background: bgColor,
                border: `1px solid ${borderColor}`,
                color: textColor,
                cursor: selectedOption !== null ? 'default' : 'pointer',
              }}
            >
              <span
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-200"
                style={{ background: letterBg, color: letterColor }}
              >
                {letter}
              </span>
              <span className="text-sm font-medium leading-snug">{opt}</span>
              {isCorrect && selectedOption !== null && (
                <span className="ml-auto text-lg">✓</span>
              )}
              {isWrong && <span className="ml-auto text-lg">✗</span>}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-600 mt-5">
        No going back — stay focused! 🎯
      </p>
    </div>
  );
}

// ─── Screen 3: Celebration ────────────────────────────────────────────────────
function CelebrationScreen({ answers, questions, onProceed }) {
  const [visible, setVisible] = useState(false);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 100);
    const t2 = setTimeout(() => {
      const confettiFn = window?.confetti;
      if (typeof confettiFn === 'function') {
        confettiFn({ particleCount: 120, spread: 90, startVelocity: 45, origin: { x: 0.5, y: 0.4 }, colors: ['#F5A623', '#8B5CF6', '#00E5A0', '#FFD700'] });
        setTimeout(() => confettiFn({ particleCount: 80, spread: 70, startVelocity: 38, origin: { x: 0.3, y: 0.5 }, colors: ['#F5A623', '#8B5CF6'] }), 250);
        setTimeout(() => confettiFn({ particleCount: 80, spread: 70, startVelocity: 38, origin: { x: 0.7, y: 0.5 }, colors: ['#00E5A0', '#FFD700'] }), 400);
      }
    }, 300);

    // Dots animation for "Loading results"
    let count = 0;
    const dotsInterval = setInterval(() => {
      count = (count + 1) % 4;
      setDots('.'.repeat(count));
    }, 500);

    const t3 = setTimeout(() => onProceed(), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearInterval(dotsInterval); };
  }, [onProceed]);

  const correct = answers.filter((a, i) => a?.selectedIdx === questions[i]?.correct_index).length;
  const total = questions.length;
  const pct = Math.round((correct / total) * 100);

  return (
    <div
      className="flex flex-col items-center text-center gap-6 py-8"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.92)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      <div className="text-7xl animate-bounce-slow">🎉</div>
      <div>
        <h2 className="text-3xl font-extrabold text-white mb-2">Quiz Complete!</h2>
        <p className="text-gray-400 text-sm">Great job finishing the diagnostic quiz.</p>
      </div>

      {/* Score ring */}
      <div
        className="flex flex-col items-center gap-1 px-8 py-5 rounded-2xl"
        style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)' }}
      >
        <span className="text-5xl font-extrabold gold-gradient-text">{pct}%</span>
        <span className="text-xs text-gray-400">{correct} / {total} correct</span>
      </div>

      <p className="text-sm text-gray-400">
        Loading your personalised results{dots}
      </p>
    </div>
  );
}

// ─── Main DiagnosticQuiz ───────────────────────────────────────────────────────
export default function DiagnosticQuiz({ onBack, onComplete }) {
  const [screen, setScreen] = useState('upload');   // 'upload' | 'quiz' | 'celebration'
  const [questions, setQuestions] = useState([]);
  const [finalAnswers, setFinalAnswers] = useState([]);

  const handleGenerate = (qs) => {
    setQuestions(qs);
    setScreen('quiz');
  };

  const handleQuizDone = (answers, qs) => {
    setFinalAnswers(answers);
    setScreen('celebration');
  };

  const handleProceed = useCallback(() => {
    // Build synthetic analysisResult from quiz scores
    const skillMap = {}; // skill -> { correct: 0, total: 0 }

    questions.forEach((q, i) => {
      const skill = q.skill;
      if (!skillMap[skill]) skillMap[skill] = { correct: 0, total: 0 };
      skillMap[skill].total += 1;
      if (finalAnswers[i]?.selectedIdx === q.correct_index) {
        skillMap[skill].correct += 1;
      }
    });

    // Determine level per skill
    const skillLevels = {};
    Object.entries(skillMap).forEach(([skill, { correct, total }]) => {
      const ratio = total > 0 ? correct / total : 0;
      if (ratio === 1) skillLevels[skill] = 'Expert';
      else if (ratio >= 0.6) skillLevels[skill] = 'Proficient';
      else if (ratio >= 0.2) skillLevels[skill] = 'Beginner';
      else skillLevels[skill] = 'Gap';
    });

    const allSkills = Object.keys(skillLevels);
    const matchingSkills = allSkills.filter((s) => skillLevels[s] === 'Expert' || skillLevels[s] === 'Proficient');
    const skillsToImprove = allSkills.filter((s) => skillLevels[s] === 'Beginner' || skillLevels[s] === 'Gap');

    const analysisResult = {
      skills_from_resume: [],
      skills_required_in_job: allSkills,
      matching_skills: matchingSkills,
      skills_to_improve: skillsToImprove,
      skill_gap_trace: { version: '1.0', gap_count: skillsToImprove.length, items: [] },
      assessed_via_quiz: true,
      quiz_skill_levels: skillLevels,
    };

    onComplete(analysisResult);
  }, [questions, finalAnswers, onComplete]);

  return (
    <div className="w-full">
      {screen === 'upload' && (
        <JDUploadScreen onGenerate={handleGenerate} onBack={onBack} />
      )}
      {screen === 'quiz' && (
        <QuizScreen questions={questions} onComplete={handleQuizDone} />
      )}
      {screen === 'celebration' && (
        <CelebrationScreen answers={finalAnswers} questions={questions} onProceed={handleProceed} />
      )}
    </div>
  );
}
