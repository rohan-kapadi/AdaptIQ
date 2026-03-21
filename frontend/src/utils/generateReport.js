import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import logoSrc from '../assets/Logo.png';

// A4 size in points: 595.28 x 841.89
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;

const COLORS = {
  bg: [10, 10, 26],         // #0A0A1A
  surface: [20, 20, 42],    // #14142A
  gold: [245, 166, 35],     // #F5A623
  textMain: [255, 255, 255],
  textMuted: [160, 160, 180],
  green: [0, 229, 160],     // #00E5A0
  red: [255, 77, 109],      // #FF4D6D
  amber: [245, 166, 35],
};

function fillRect(doc, x, y, w, h, color) {
  doc.setFillColor(...color);
  doc.rect(x, y, w, h, 'F');
}

function roundedRect(doc, x, y, w, h, r, color, strokeColor = null) {
  doc.setFillColor(...color);
  if (strokeColor) {
    doc.setDrawColor(...strokeColor);
    doc.setLineWidth(1);
    doc.roundedRect(x, y, w, h, r, r, 'FD');
  } else {
    doc.roundedRect(x, y, w, h, r, r, 'F');
  }
}

function writeText(doc, text, x, y, size = 12, color = COLORS.textMain, font = 'helvetica', style = 'normal', align = 'left') {
  doc.setFont(font, style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(text, x, y, { align });
}

export async function generatePDFReport(data) {
  const {
    candidateName = 'Candidate',
    targetRole = 'Target Role',
    matchRate = 0,
    marketFit = 0,
    skillsToGrow = 0,
    skills = [],
    analysisResult = null,
  } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Load logo as base64
  let logoDataUrl = null;
  try {
    const response = await fetch(logoSrc);
    const blob = await response.blob();
    logoDataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Logo load failed, using text fallback', e);
  }

  // Helper: draw logo + brand in top-left corner of each page
  const drawPageHeader = (yOffset = 40) => {
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', yOffset, yOffset, 44, 44);
    } else {
      fillRect(doc, yOffset, yOffset, 44, 44, COLORS.surface);
    }
    writeText(doc, 'AdaptIQ', yOffset + 52, yOffset + 26, 22, COLORS.gold, 'helvetica', 'bold');
    writeText(doc, 'AI-Adaptive Onboarding Engine', yOffset + 52, yOffset + 40, 9, COLORS.textMuted);
  };

  // =========================================================================
  // PAGE 1: COVER PAGE
  // =========================================================================
  fillRect(doc, 0, 0, PAGE_W, PAGE_H, COLORS.bg);

  // Decorative top bar
  fillRect(doc, 0, 0, PAGE_W, 8, COLORS.gold);

  // Logo + brand
  drawPageHeader(40);


  // Title
  writeText(doc, 'Skill Gap Analysis', 40, PAGE_H / 2 - 60, 46, COLORS.textMain, 'helvetica', 'bold');
  writeText(doc, 'Comprehensive Report', 40, PAGE_H / 2 - 20, 32, COLORS.gold, 'helvetica', 'normal');

  // Details box
  roundedRect(doc, 40, PAGE_H / 2 + 30, PAGE_W - 80, 140, 12, COLORS.surface, [40, 40, 80]);
  
  writeText(doc, 'PREPARED FOR', 60, PAGE_H / 2 + 65, 10, COLORS.textMuted, 'helvetica', 'bold');
  writeText(doc, candidateName, 60, PAGE_H / 2 + 90, 22, COLORS.textMain, 'helvetica', 'bold');
  
  writeText(doc, 'TARGET ROLE', 60, PAGE_H / 2 + 125, 10, COLORS.textMuted, 'helvetica', 'bold');
  writeText(doc, targetRole, 60, PAGE_H / 2 + 150, 16, COLORS.textMain);

  // Date
  writeText(doc, `Generated on ${today}`, 40, PAGE_H - 50, 10, COLORS.textMuted);

  // =========================================================================
  // PAGE 2: EXECUTIVE SUMMARY
  // =========================================================================
  doc.addPage();
  fillRect(doc, 0, 0, PAGE_W, PAGE_H, COLORS.bg);
  fillRect(doc, 0, 0, PAGE_W, 4, COLORS.gold);
  drawPageHeader(20);

  writeText(doc, 'Executive Summary', MARGIN, 100, 24, COLORS.gold, 'helvetica', 'bold');

  // Match Rate Gauge (rendered using jsPDF drawing)
  roundedRect(doc, MARGIN, 120, (PAGE_W - 3 * MARGIN) / 2, 200, 16, COLORS.surface, [40, 40, 80]);
  
  const ctxX = MARGIN + ((PAGE_W - 3 * MARGIN) / 2) / 2;
  const ctxY = 120 + 100;
  const radius = 50;

  // Background circle
  doc.setDrawColor(40, 40, 80);
  doc.setLineWidth(14);
  doc.circle(ctxX, ctxY, radius, 'S');

  // foreground arc (approximate with manual path or simple text if arc is hard)
  // jsPDF lines are easier. We'll simplify the radial to text + small custom bar.
  doc.setDrawColor(...(matchRate >= 75 ? COLORS.green : matchRate >= 50 ? COLORS.amber : COLORS.red));
  doc.setLineWidth(14);
  doc.line(ctxX - radius, ctxY, ctxX + radius, ctxY); // A simple placeholder line to represent score if real arc is missing.
  // Wait, let's just make it a clean large text gauge
  fillRect(doc, MARGIN, 120, (PAGE_W - 3 * MARGIN) / 2, 200, COLORS.surface);
  roundedRect(doc, MARGIN, 120, (PAGE_W - 3 * MARGIN) / 2, 200, 12, COLORS.surface, [40, 40, 80]);
  
  writeText(doc, 'MATCH RATE', ctxX, 160, 12, COLORS.textMuted, 'helvetica', 'bold', 'center');
  writeText(doc, `${matchRate}%`, ctxX, 220, 54, COLORS.textMain, 'helvetica', 'bold', 'center');
  
  // Market Fit
  const rightBoxX = MARGIN * 2 + ((PAGE_W - 3 * MARGIN) / 2);
  roundedRect(doc, rightBoxX, 120, (PAGE_W - 3 * MARGIN) / 2, 90, 12, COLORS.surface, [40, 40, 80]);
  writeText(doc, 'MARKET FIT', rightBoxX + 20, 145, 10, COLORS.textMuted, 'helvetica', 'bold');
  writeText(doc, `${marketFit}/100`, rightBoxX + 20, 185, 28, COLORS.gold, 'helvetica', 'bold');

  // Skills to Grow
  roundedRect(doc, rightBoxX, 230, (PAGE_W - 3 * MARGIN) / 2, 90, 12, COLORS.surface, [40, 40, 80]);
  writeText(doc, 'SKILLS TO GROW', rightBoxX + 20, 255, 10, COLORS.textMuted, 'helvetica', 'bold');
  writeText(doc, `${skillsToGrow}`, rightBoxX + 20, 295, 28, COLORS.red, 'helvetica', 'bold');

  // Verdict
  let verdict = 'Needs Work';
  let verdictColor = COLORS.red;
  if (matchRate >= 80) { verdict = 'Strong Fit'; verdictColor = COLORS.green; }
  else if (matchRate >= 60) { verdict = 'Good Match'; verdictColor = COLORS.amber; }

  roundedRect(doc, MARGIN, 350, PAGE_W - 2 * MARGIN, 80, 12, COLORS.surface, verdictColor);
  writeText(doc, 'OVERALL VERDICT', MARGIN + 20, 380, 10, COLORS.textMuted, 'helvetica', 'bold');
  writeText(doc, verdict, MARGIN + 20, 410, 20, verdictColor, 'helvetica', 'bold');

  // Text summary
  writeText(doc, 'Summary & Next Steps', MARGIN, 480, 16, COLORS.textMain, 'helvetica', 'bold');
  const summaryText = `Based on the provided resume and job description, the candidate has an estimated match rate of ${matchRate}%. The market fit score is ${marketFit}/100. There are ${skillsToGrow} key technical skills or core proficiencies identified as gaps that need to be learned. See the following pages for a detailed breakdown and personalized learning roadmap.`;
  const splitSummary = doc.splitTextToSize(summaryText, PAGE_W - 2 * MARGIN);
  writeText(doc, splitSummary, MARGIN, 510, 12, COLORS.textMuted, 'helvetica', 'normal', 'left');

  // =========================================================================
  // PAGE 3: SKILL GAP ANALYSIS
  // =========================================================================
  doc.addPage();
  fillRect(doc, 0, 0, PAGE_W, PAGE_H, COLORS.bg);
  fillRect(doc, 0, 0, PAGE_W, 4, COLORS.gold);
  drawPageHeader(20);

  writeText(doc, 'Detailed Skill Analysis', MARGIN, 100, 24, COLORS.gold, 'helvetica', 'bold');

  const allDetected = analysisResult?.skills_from_resume || [];
  const reqSkills = analysisResult?.skills_required_in_job || [];
  const gaps = analysisResult?.skills_to_improve || [];

  const matched = reqSkills.filter(s => !gaps.includes(s));
  
  // Left Column - Matched
  const colW = (PAGE_W - 3 * MARGIN) / 2;
  writeText(doc, `MATCHED SKILLS (${matched.length})`, MARGIN, 130, 12, COLORS.green, 'helvetica', 'bold');
  
  let yPosM = 160;
  matched.slice(0, 15).forEach((skill) => {
    roundedRect(doc, MARGIN, yPosM, colW, 30, 6, COLORS.surface);
    writeText(doc, skill.length > 25 ? skill.slice(0, 23) + '...' : skill, MARGIN + 10, yPosM + 20, 11, COLORS.textMain);
    // Green bar
    fillRect(doc, MARGIN + colW - 60, yPosM + 12, 45, 6, [0, 80, 50]);
    fillRect(doc, MARGIN + colW - 60, yPosM + 12, 45, 6, COLORS.green);
    yPosM += 40;
  });

  // Right Column - Gaps
  writeText(doc, `SKILL GAPS (${gaps.length})`, MARGIN * 2 + colW, 130, 12, COLORS.red, 'helvetica', 'bold');
  let yPosG = 160;
  gaps.slice(0, 15).forEach((skill) => {
    roundedRect(doc, MARGIN * 2 + colW, yPosG, colW, 30, 6, COLORS.surface);
    writeText(doc, skill.length > 25 ? skill.slice(0, 23) + '...' : skill, MARGIN * 2 + colW + 10, yPosG + 20, 11, COLORS.textMain);
    // Red bar (empty)
    fillRect(doc, MARGIN * 2 + colW + colW - 60, yPosG + 12, 45, 6, [80, 20, 30]);
    fillRect(doc, MARGIN * 2 + colW + colW - 60, yPosG + 12, 10, 6, COLORS.red);
    yPosG += 40;
  });

  // =========================================================================
  // PAGE 4: LEARNING ROADMAP
  // =========================================================================
  if (skills && skills.length > 0) {
    doc.addPage();
    fillRect(doc, 0, 0, PAGE_W, PAGE_H, COLORS.bg);
    fillRect(doc, 0, 0, PAGE_W, 4, COLORS.gold);
    drawPageHeader(20);

    writeText(doc, 'Adaptive Learning Roadmap', MARGIN, 100, 24, COLORS.gold, 'helvetica', 'bold');

    const roadmapList = skills.slice(0, 7);
    let yPosR = 135;
    
    for (let i = 0; i < roadmapList.length; i++) {
      const sk = roadmapList[i];
      const hrs = 6 + (i * 2); // mockup hours
      const diff = i < 2 ? 'Beginner' : i < 5 ? 'Intermediate' : 'Advanced';
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(sk.name + ' tutorial crash course')}`;
      
      let qrDataUrl = null;
      try {
        qrDataUrl = await QRCode.toDataURL(searchUrl, { margin: 1, color: { dark: '#F5A623', light: '#14142A' } });
      } catch (e) {
        console.error('QR code generation failed', e);
      }

      roundedRect(doc, MARGIN, yPosR, PAGE_W - 2 * MARGIN, 70, 8, COLORS.surface, [40, 40, 80]);
      
      // Step number
      roundedRect(doc, MARGIN + 15, yPosR + 20, 30, 30, 15, COLORS.gold);
      writeText(doc, `${i + 1}`, MARGIN + 30, yPosR + 40, 14, COLORS.bg, 'helvetica', 'bold', 'center');

      // Title & Details
      writeText(doc, sk.name, MARGIN + 60, yPosR + 30, 14, COLORS.textMain, 'helvetica', 'bold');
      writeText(doc, `Est. Time: ${hrs} hours  |  Level: ${diff}`, MARGIN + 60, yPosR + 48, 10, COLORS.textMuted);

      // QR Code
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', PAGE_W - MARGIN - 60, yPosR + 10, 50, 50);
        writeText(doc, 'Scan to Learn', PAGE_W - MARGIN - 35, yPosR + 67, 7, COLORS.textMuted, 'helvetica', 'normal', 'center');
      }

      yPosR += 85;
    }

    const totalHours = roadmapList.reduce((acc, _, i) => acc + (6 + i * 2), 0);
    writeText(doc, `Total Estimated Study Time: ~${totalHours} hours`, MARGIN, yPosR + 20, 14, COLORS.gold, 'helvetica', 'bold');
  }

  // =========================================================================
  // PAGE 5: AI REASONING TRACE
  // =========================================================================
  const traceItems = analysisResult?.skill_gap_trace?.items;
  if (traceItems && traceItems.length > 0) {
    doc.addPage();
    fillRect(doc, 0, 0, PAGE_W, PAGE_H, COLORS.bg);
    fillRect(doc, 0, 0, PAGE_W, 4, COLORS.gold);
    drawPageHeader(20);

    writeText(doc, 'AI Reasoning Trace', MARGIN, 100, 24, COLORS.green, 'helvetica', 'bold');
    writeText(doc, 'adaptiq-trace v1.0 engine execution log', MARGIN, 114, 10, COLORS.textMuted, 'courier');

    let tY = 148;
    
    roundedRect(doc, MARGIN, 115, PAGE_W - 2 * MARGIN, PAGE_H - 160, 8, [5, 5, 12], COLORS.green);
    
    doc.setFont('courier', 'normal');
    
    // Header log
    writeText(doc, `$ session start --trace-mode`, MARGIN + 15, tY, 9, COLORS.textMain, 'courier');
    tY += 20;

    traceItems.forEach((item, idx) => {
      if (tY > PAGE_H - 80) return; // cut off if it overflows
      
      doc.setTextColor(...COLORS.green);
      doc.text(`[${String(idx + 1).padStart(2, '0')}]`, MARGIN + 15, tY);
      doc.setTextColor(...COLORS.textMain);
      doc.text(` GAP MATCH FOUND: ${item.skill}`, MARGIN + 40, tY);
      tY += 15;

      doc.setTextColor(...COLORS.textMuted);
      doc.text(`jd> `, MARGIN + 15, tY);
      
      // Wrap JD phrase
      let phrase = item.jd_phrase ? `"${item.jd_phrase.trim()}"` : '(inferred from context)';
      const splitPhrase = doc.splitTextToSize(phrase, PAGE_W - 2 * MARGIN - 60);
      doc.setTextColor(...COLORS.amber);
      doc.text(splitPhrase, MARGIN + 40, tY);
      tY += 12 * splitPhrase.length;

      doc.setTextColor(...COLORS.textMuted);
      doc.text(`why>`, MARGIN + 15, tY);
      doc.setTextColor(200, 200, 200);
      const reason = doc.splitTextToSize(item.reason || 'Missing in candidate profile.', PAGE_W - 2 * MARGIN - 60);
      doc.text(reason, MARGIN + 40, tY);
      tY += 12 * reason.length + 15;
    });
  }

  // Format filename and save
  const safeName = candidateName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `AdaptIQ_Report_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
