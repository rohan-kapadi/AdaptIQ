/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';

/**
 * SkillsVisualization — Horizontal bar chart comparing Your Skills vs Required Skills
 * Replaces the old radial/polar chart for better readability.
 */
export function SkillsVisualization({ analysisResult }) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setAnimated(true);
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  if (!analysisResult) return null;

  const {
    skills_from_resume = [],
    skills_required_in_job = [],
    matching_skills = [],
    skills_to_improve = [],
  } = analysisResult;

  // Build a unified skill set from the union of resume + required
  const allSkills = [...new Set([...skills_required_in_job, ...skills_from_resume])];

  const getStatus = (skill) => {
    const inResume = skills_from_resume.includes(skill);
    const inJob    = skills_required_in_job.includes(skill);
    if (inResume && inJob)   return 'match';
    if (inResume && !inJob)  return 'extra';
    return 'gap';
  };

  const statusConfig = {
    match: { label: 'You Have It',      color: '#00E5A0', bg: 'rgba(0,229,160,0.12)',  resumePct: 100, jobPct: 100 },
    extra: { label: 'Bonus Skill',       color: '#8B9CF4', bg: 'rgba(139,156,244,0.12)', resumePct: 100, jobPct: 0   },
    gap:   { label: 'Need to Learn',     color: '#FF4D6D', bg: 'rgba(255,77,109,0.12)', resumePct: 0,   jobPct: 100 },
  };

  // Limit display to first 12 skills
  const displaySkills = allSkills.slice(0, 12);

  return (
    <div ref={ref} className="glass-card p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          📊 Skills Comparison
        </h3>
        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}80` }}
              />
              <span className="text-xs text-gray-400">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center gap-3 mb-3 px-2">
        <div className="w-32 flex-shrink-0 text-xs text-gray-500 font-medium text-right pr-3">Skill</div>
        <div className="flex-1 grid grid-cols-2 gap-2 text-xs text-gray-500 font-medium">
          <span>Your Resume</span>
          <span className="text-right">Job Required</span>
        </div>
      </div>

      {/* Skill rows */}
      <div className="space-y-2.5">
        {displaySkills.map((skill, i) => {
          const status = getStatus(skill);
          const cfg = statusConfig[status];

          return (
            <div
              key={skill}
              className="flex items-center gap-3 group"
              data-tooltip={`${skill} — ${cfg.label}`}
            >
              {/* Skill name */}
              <div className="w-32 flex-shrink-0 text-right">
                <span
                  className="text-xs font-medium truncate block"
                  style={{ color: cfg.color }}
                >
                  {skill.length > 16 ? skill.slice(0, 14) + '…' : skill}
                </span>
              </div>

              {/* Split bars */}
              <div className="flex-1 grid grid-cols-2 gap-2 items-center">
                {/* Resume bar — grows RIGHT */}
                <div className="flex justify-end">
                  <div className="w-full max-w-[140px] h-2 rounded-full overflow-hidden bg-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: animated ? `${cfg.resumePct}%` : '0%',
                        background: cfg.color,
                        boxShadow: `0 0 6px ${cfg.color}60`,
                        transitionDelay: `${i * 60}ms`,
                        marginLeft: 'auto',
                      }}
                    />
                  </div>
                </div>

                {/* Job bar — grows LEFT */}
                <div className="flex justify-start">
                  <div className="w-full max-w-[140px] h-2 rounded-full overflow-hidden bg-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: animated ? `${cfg.jobPct}%` : '0%',
                        background: status === 'gap' ? '#FF4D6D' : status === 'match' ? '#00E5A0' : 'rgba(139,156,244,0.3)',
                        boxShadow: `0 0 6px ${cfg.color}60`,
                        transitionDelay: `${i * 60}ms`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Status tag */}
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 hidden sm:inline-block"
                style={{
                  background: cfg.bg,
                  color: cfg.color,
                  border: `1px solid ${cfg.color}35`,
                }}
              >
                {status === 'match' ? '✓' : status === 'extra' ? '+' : '✗'}
              </span>
            </div>
          );
        })}
      </div>

      {allSkills.length > 12 && (
        <p className="text-xs text-gray-500 text-center mt-4">
          Showing 12 of {allSkills.length} skills
        </p>
      )}

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Matched',      count: matching_skills.length,  color: '#00E5A0' },
          { label: 'Gaps',         count: skills_to_improve.length, color: '#FF4D6D' },
          { label: 'Bonus Skills', count: Math.max(0, skills_from_resume.length - matching_skills.length), color: '#8B9CF4' },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-xl p-3"
            style={{ background: `${stat.color}0D`, border: `1px solid ${stat.color}25` }}
          >
            <div className="text-2xl font-extrabold" style={{ color: stat.color }}>{stat.count}</div>
            <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}