import { Injectable, signal } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

export interface CompetencyDefinition {
  name: string;
  category: 'Technical' | 'Business' | 'Cognitive' | 'Interpersonal';
  keywords: string[];
  verbs: string[];
}

export interface ScoreContribution {
  factor: string;
  contribution: number;
  description: string;
}

export interface AnalysisResult {
  matchScore: number;          // semantic cosine similarity (0-100)
  atsScore: number;            // combined universal score (0-100)
  keywordMatchRate: number;    // competency match rate (0-100)
  keywordDensity: number;      // impact score (0-100)
  matchedSkills: string[];     // matched competencies
  missingSkills: string[];     // missing competencies
  recommendations: string[];   // actionable recommendations
  breakdown: ScoreContribution[];
  weakSignals: string[];       // behavior & structural weak signals
  analyzedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyzerService {
  private model: use.UniversalSentenceEncoder | null = null;
  private embeddingCache = new Map<string, number[]>();

  // Reactively track loading state
  modelStatus = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  loadingProgress = signal<number>(0);

  // Universal Competency Taxonomy (12 core categories covering all industries)
  private readonly COMPETENCIES: CompetencyDefinition[] = [
    {
      name: 'Software Development',
      category: 'Technical',
      keywords: ['javascript', 'typescript', 'python', 'java', 'go', 'golang', 'rust', 'c#', 'c++', 'php', 'ruby', 'html', 'css', 'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'git', 'sql', 'nosql', 'database', 'api', 'docker', 'kubernetes', 'aws', 'cloud', 'devops'],
      verbs: ['build', 'built', 'develop', 'developed', 'program', 'programmed', 'code', 'coded', 'engineer', 'engineered', 'write', 'wrote', 'compile', 'compiled', 'debug', 'debugged', 'deploy', 'deployed', 'integrate', 'integrated', 'refactor', 'refactored', 'architect', 'architected']
    },
    {
      name: 'Data Analysis & Research',
      category: 'Cognitive',
      keywords: ['data', 'analytics', 'statistics', 'excel', 'tableau', 'powerbi', 'pandas', 'numpy', 'scipy', 'r', 'sql', 'database', 'query', 'visualization', 'dashboard', 'modeling', 'experiment', 'hypothesis', 'research', 'scientific', 'academic', 'literature'],
      verbs: ['analyze', 'analyzed', 'research', 'researched', 'gather', 'gathered', 'interpret', 'interpreted', 'model', 'modeled', 'evaluate', 'evaluated', 'verify', 'verified', 'extract', 'extracted', 'compile', 'compiled', 'track', 'tracked']
    },
    {
      name: 'System Architecture & Infrastructure',
      category: 'Technical',
      keywords: ['architecture', 'infrastructure', 'cloud', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible', 'server', 'linux', 'networking', 'security', 'scalability', 'microservices', 'cicd', 'pipeline', 'deployment', 'virtualization'],
      verbs: ['design', 'designed', 'architect', 'architected', 'configure', 'configured', 'deploy', 'deployed', 'scale', 'scaled', 'optimize', 'optimized', 'secure', 'secured', 'automate', 'automated', 'provision', 'provisioned']
    },
    {
      name: 'Leadership & Team Management',
      category: 'Interpersonal',
      keywords: ['team', 'leadership', 'management', 'manager', 'lead', 'director', 'supervisor', 'scrum', 'agile', 'sprint', 'coordination', 'recruitment', 'hiring', 'mentorship', 'coaching', 'collaboration', 'strategy', 'resource planning'],
      verbs: ['lead', 'led', 'manage', 'managed', 'mentor', 'mentored', 'coach', 'coached', 'supervise', 'supervised', 'coordinate', 'coordinated', 'direct', 'directed', 'hire', 'hired', 'recruit', 'recruited', 'establish', 'established', 'delegate', 'delegated']
    },
    {
      name: 'Sales & Business Development',
      category: 'Business',
      keywords: ['sales', 'sell', 'revenue', 'business development', 'client acquisition', 'customer acquisition', 'negotiation', 'partnership', 'market expansion', 'pipeline', 'closing', 'leads', 'pitch', 'proposal', 'contract', 'deal'],
      verbs: ['sell', 'sold', 'negotiate', 'negotiated', 'acquire', 'acquired', 'close', 'closed', 'generate', 'generated', 'expand', 'expanded', 'pitch', 'pitched', 'secure', 'secured', 'increase', 'increased', 'grow', 'grew']
    },
    {
      name: 'Marketing & Brand Strategy',
      category: 'Business',
      keywords: ['marketing', 'brand', 'advertising', 'seo', 'sem', 'campaign', 'social media', 'content strategy', 'analytics', 'copywriting', 'publicity', 'pr', 'email marketing', 'market research', 'product launch', 'demographic'],
      verbs: ['promote', 'promoted', 'market', 'marketed', 'advertise', 'advertised', 'launch', 'launched', 'design', 'designed', 'campaign', 'campaigned', 'write', 'wrote', 'position', 'positioned', 'drive', 'driven']
    },
    {
      name: 'Operations & Project Management',
      category: 'Business',
      keywords: ['operations', 'project management', 'workflow', 'process', 'efficiency', 'logistics', 'supply chain', 'budget', 'procurement', 'vendor', 'compliance', 'risk management', 'agile', 'scrum', 'kanban', 'milestones', 'deliverables', 'sop'],
      verbs: ['optimize', 'optimized', 'organize', 'organized', 'streamline', 'streamlined', 'execute', 'executed', 'monitor', 'monitored', 'budget', 'budgeted', 'coordinate', 'coordinated', 'improve', 'improved', 'standardize', 'standardized']
    },
    {
      name: 'Customer Support & Interaction',
      category: 'Interpersonal',
      keywords: ['customer', 'client', 'support', 'service', 'queries', 'complaints', 'helpdesk', 'resolution', 'satisfaction', 'relationship', 'feedback', 'retention', 'onboarding', 'account management', 'consultation'],
      verbs: ['assist', 'assisted', 'resolve', 'resolved', 'support', 'supported', 'handle', 'handled', 'serve', 'served', 'respond', 'responded', 'advise', 'advised', 'consult', 'consulted', 'guide', 'guided', 'retain', 'retained']
    },
    {
      name: 'Problem Solving & Critical Thinking',
      category: 'Cognitive',
      keywords: ['problem solving', 'troubleshooting', 'debugging', 'optimization', 'critical thinking', 'analytical', 'resolution', 'innovation', 'diagnostics', 'bug fixing', 'refactoring', 'root cause', 'logic', 'algorithms'],
      verbs: ['solve', 'solved', 'resolve', 'resolved', 'fix', 'fixed', 'troubleshoot', 'troubleshot', 'debug', 'debugged', 'innovate', 'innovated', 'diagnose', 'diagnosed', 'refine', 'refined', 'overcome', 'overcame']
    },
    {
      name: 'Creative Design & Layout',
      category: 'Cognitive',
      keywords: ['design', 'layout', 'ui', 'ux', 'graphic', 'figma', 'sketch', 'adobe', 'photoshop', 'illustrator', 'wireframe', 'prototype', 'typography', 'branding', 'visual', 'creative', 'user interface', 'user experience'],
      verbs: ['design', 'designed', 'create', 'created', 'illustrate', 'illustrated', 'sketch', 'sketched', 'prototype', 'prototyped', 'draw', 'drew', 'visualize', 'visualized', 'revamp', 'revamped']
    },
    {
      name: 'Financial Planning & Accounting',
      category: 'Business',
      keywords: ['finance', 'financial', 'accounting', 'audit', 'tax', 'budget', 'ledger', 'balance sheet', 'p&l', 'revenue', 'forecast', 'cash flow', 'cost reduction', 'roi', 'pricing', 'compliance', 'excel', 'bookkeeping'],
      verbs: ['audit', 'audited', 'calculate', 'calculated', 'forecast', 'forecasted', 'budget', 'budgeted', 'reduce', 'reduced', 'optimize', 'optimized', 'record', 'recorded', 'report', 'reported', 'manage', 'managed']
    },
    {
      name: 'Human Resources & Talent Acquisition',
      category: 'Interpersonal',
      keywords: ['hr', 'human resources', 'talent', 'recruiting', 'recruitment', 'hiring', 'onboarding', 'training', 'employee relations', 'culture', 'compensation', 'benefits', 'performance management', 'payroll', 'mediation'],
      verbs: ['recruit', 'recruited', 'hire', 'hired', 'train', 'trained', 'onboard', 'onboarded', 'evaluate', 'evaluated', 'manage', 'managed', 'mediate', 'mediated', 'develop', 'developed']
    }
  ];

  constructor() {
    // Model assets are lazy-loaded
  }

  /**
   * Pre-loads the TensorFlow.js model and Universal Sentence Encoder
   */
  async loadModel(): Promise<void> {
    if (this.modelStatus() === 'loading' || this.modelStatus() === 'loaded') {
      return;
    }

    try {
      this.modelStatus.set('loading');
      this.loadingProgress.set(10);
      
      // Initialize TensorFlow backend (WebGL or CPU fallback)
      await tf.ready();
      this.loadingProgress.set(30);

      // Build model URL relative to document.baseURI so it works under any base-href
      const baseUrl = document.baseURI.endsWith('/') ? document.baseURI : `${document.baseURI}/`;
      this.model = await use.load({
        modelUrl: `${baseUrl}models/use-lite/model.json`,
        vocabUrl: 'https://storage.googleapis.com/tfjs-models/savedmodel/universal_sentence_encoder/vocab.json'
      });
      
      this.loadingProgress.set(100);
      this.modelStatus.set('loaded');
    } catch (error) {
      console.error('Failed to load TensorFlow/USE model:', error);
      this.modelStatus.set('error');
    }
  }

  /**
   * Lazy-loads or retrieves cached embedding vector for a block of text
   */
  private async getEmbedding(text: string): Promise<number[]> {
    const trimmed = text.trim();
    if (this.embeddingCache.has(trimmed)) {
      return this.embeddingCache.get(trimmed)!;
    }

    if (!this.model) {
      await this.loadModel();
      if (!this.model) {
        throw new Error('Analysis engine could not be initialized.');
      }
    }

    const embeddings = await this.model.embed([trimmed]);
    const embeddingData = await embeddings.array();
    embeddings.dispose(); // clean up tensor immediately

    const vector = embeddingData[0];
    this.embeddingCache.set(trimmed, vector);
    return vector;
  }

  /**
   * Analyzes the match between resume and job description.
   */
  async analyze(resumeText: string, jdText: string): Promise<AnalysisResult> {
    // 1. Calculate Experience Relevance via Cosine Similarity of neural embeddings
    const vecA = await this.getEmbedding(resumeText);
    const vecB = await this.getEmbedding(jdText);
    const matchScore = this.calculateCosineSimilarity(vecA, vecB);

    // 2. Perform Competency Extraction & Gap Analysis
    const requiredCompetencies = this.extractCompetencies(jdText);
    const resumeCompetencies = this.extractCompetencies(resumeText);

    // Determine Matched vs Missing
    const matchedSkills = requiredCompetencies.filter(c => resumeCompetencies.includes(c));
    const missingSkills = requiredCompetencies.filter(c => !resumeCompetencies.includes(c));

    const keywordMatchRate = requiredCompetencies.length > 0 
      ? Math.round((matchedSkills.length / requiredCompetencies.length) * 100)
      : 100;

    // 3. Evaluate Impact / Achievements
    const keywordDensity = this.calculateImpactScore(resumeText); // mapped keywordDensity field to impact score %

    // 4. Calculate quality formatting & contact channels
    const qualityScore = this.calculateQualityScore(resumeText);

    // 5. Compute Universal Resume Score & Explainability Breakdown
    const { atsScore, breakdown } = this.calculateUniversalScore(matchScore, keywordMatchRate, keywordDensity, qualityScore, requiredCompetencies.length, matchedSkills.length, resumeText.length);

    // 6. Detect Weak Signals
    const weakSignals = this.detectWeakSignals(keywordDensity, qualityScore, resumeText);

    // 7. Generate Actionable Coaching Suggestions
    const recommendations = this.generateUniversalRecommendations(atsScore, matchedSkills, missingSkills, keywordDensity);

    return {
      matchScore,
      atsScore,
      keywordMatchRate,
      keywordDensity,
      matchedSkills,
      missingSkills,
      recommendations,
      breakdown,
      weakSignals,
      analyzedAt: new Date().toLocaleString()
    };
  }

  /**
   * Computes Cosine Similarity between two pre-calculated vectors.
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;

    const similarity = dotProduct / (normA * normB);
    
    // Scale similarity to [0%, 100%]
    const minSim = 0.2;
    const maxSim = 0.85;
    let normalized = (similarity - minSim) / (maxSim - minSim);
    normalized = Math.max(0, Math.min(1, normalized)); // clamp to [0, 1]

    return Math.round(normalized * 100);
  }

  /**
   * Evaluates text length and triggers thresholds for competency keywords
   */
  private extractCompetencies(text: string): string[] {
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    // Lower threshold for shorter texts (like job description snippets)
    const threshold = words < 120 ? 1 : 2;
    
    const found: string[] = [];
    for (const comp of this.COMPETENCIES) {
      let count = 0;
      const allTerms = [...comp.keywords, ...comp.verbs];
      for (const term of allTerms) {
        const escaped = term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        // Word boundary lookahead/behind matches special symbols like C# and .NET safely
        const regex = new RegExp(`(?<=^|[^a-zA-Z0-9])${escaped}(?=$|[^a-zA-Z0-9])`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          count += matches.length;
        }
      }
      if (count >= threshold) {
        found.push(comp.name);
      }
    }
    return found;
  }

  /**
   * Measures density of impact indicators (percentages, numbers, currency metrics + outcome verbs)
   */
  private calculateImpactScore(resumeText: string): number {
    // Look for numbers like 40%, $50K, 10x, 3 million, etc.
    const metricRegex = /\b\d+(?:%|\s?x|\s?billion|\s?million|\s?k|\s?m)?\b|(?:\$\d+(?:\s?[kKmMbB])?)\b/g;
    const metricMatches = resumeText.match(metricRegex) || [];
    
    // Outcome verbs
    const outcomeVerbs = ['improved', 'increased', 'reduced', 'saved', 'achieved', 'delivered', 'boosted', 'grew', 'scaled', 'optimized', 'launched', 'generated'];
    let verbMatches = 0;
    for (const verb of outcomeVerbs) {
      const regex = new RegExp(`(?<=^|[^a-zA-Z0-9])${verb}(?=$|[^a-zA-Z0-9])`, 'gi');
      const matches = resumeText.match(regex);
      if (matches) verbMatches += matches.length;
    }
    
    const totalIndicators = metricMatches.length + verbMatches;
    
    if (totalIndicators >= 8) return 100;
    if (totalIndicators >= 5) return 80;
    if (totalIndicators >= 3) return 55;
    if (totalIndicators >= 1) return 30;
    return 10;
  }

  /**
   * Calculates structural and contact quality (out of 15 max score points)
   */
  private calculateQualityScore(resumeText: string): number {
    let score = 0;
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeText);
    const hasPhone = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}(?:[-.\s]?\d{3,5})?/.test(resumeText);
    const hasLink = /linkedin\.com|github\.com|twitter\.com|facebook\.com|(?:\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b)/.test(resumeText);

    if (hasEmail) score += 3;
    if (hasPhone) score += 3;
    if (hasLink) score += 3;

    const words = resumeText.split(/\s+/).filter(w => w.length > 0).length;
    if (words >= 200 && words <= 850) {
      score += 6;
    } else if ((words >= 100 && words < 200) || (words > 850 && words <= 1200)) {
      score += 4;
    } else {
      score += 1;
    }

    return score;
  }

  /**
   * Computes the overall Universal Resume Score (0-100) and breakdown contributions
   */
  private calculateUniversalScore(
    matchScore: number,
    keywordMatchRate: number,
    keywordDensity: number,
    qualityScore: number,
    reqCount: number,
    matchCount: number,
    textLength: number
  ): { atsScore: number, breakdown: ScoreContribution[] } {
    // 1. Competency Match (40% weight)
    const competencyWeight = keywordMatchRate * 0.4;

    // 2. Experience Relevance (25% weight)
    const relevanceWeight = matchScore * 0.25;

    // 3. Impact / Achievements (20% weight)
    const impactWeight = keywordDensity * 0.2;

    // 4. Resume Quality (15% weight)
    const qualityWeight = qualityScore; // qualityScore is out of 15

    const finalScore = Math.max(0, Math.min(100, Math.round(competencyWeight + relevanceWeight + impactWeight + qualityWeight)));
    const words = Math.round(textLength / 6); // estimate words

    const breakdown: ScoreContribution[] = [
      {
        factor: 'Competency Alignment',
        contribution: Math.round(competencyWeight),
        description: `Overlaps ${matchCount} of ${reqCount || 1} core competencies required by the Job Description.`
      },
      {
        factor: 'Experience Relevance',
        contribution: Math.round(relevanceWeight),
        description: 'Measures contextual semantic similarity of your responsibilities using neural embeddings.'
      },
      {
        factor: 'Impact & Outcomes',
        contribution: Math.round(impactWeight),
        description: `Evaluates presence of numbers, metrics, currencies, and result-oriented verbs. Score: ${keywordDensity}%.`
      },
      {
        factor: 'Resume Quality & Structure',
        contribution: Math.round(qualityWeight),
        description: `Checks contact channels and layout length (${words} words). Score: ${Math.round((qualityScore / 15) * 100)}%.`
      }
    ];

    return { atsScore: finalScore, breakdown };
  }

  /**
   * Analyzes signals and flags structural or contextual weaknesses
   */
  private detectWeakSignals(impactScore: number, qualityScore: number, resumeText: string): string[] {
    const signals: string[] = [];
    const words = resumeText.split(/\s+/).filter(w => w.length > 0).length;

    if (impactScore < 55) {
      signals.push('Low quantified outcomes: Your bullet points focus on tasks and duties rather than measurable results (percentages, savings, scale).');
    }
    
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeText);
    const hasPhone = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}(?:[-.\s]?\d{3,5})?/.test(resumeText);
    if (!hasEmail || !hasPhone) {
      signals.push('Missing contact channels: Ensure your email and phone number are clearly visible on the first page.');
    }

    if (words < 200) {
      signals.push('Resume is too brief: A word count below 200 words might be rejected by ATS algorithms as lacking depth.');
    } else if (words > 900) {
      signals.push('Resume is excessively wordy: High word density reduces human readability and dilutes key highlights.');
    }

    return signals;
  }

  /**
   * Dynamically constructs recommendations based on ATS scores, gaps, and signals.
   */
  private generateUniversalRecommendations(
    score: number,
    matched: string[],
    missing: string[],
    impactScore: number
  ): string[] {
    const recs: string[] = [];

    if (score >= 80) {
      recs.push('Excellent profile readiness! Your resume matches the job requirements and shows high quality.');
    } else if (score >= 60) {
      recs.push('Strong compatibility. Tailoring your experience description to address missing competencies will help you stand out.');
    } else {
      recs.push('Low initial alignment. Reframe your experiences to focus on outcomes and add required competencies.');
    }

    if (missing.length > 0) {
      const topMissing = missing.slice(0, 3).join(', ');
      recs.push(`Core Gap: Highlight situations where you demonstrated **${topMissing}** in your previous roles.`);
    }

    if (impactScore < 60) {
      recs.push('Outcome focus: Reframe duties as achievements. Use numbers: replace "Responsible for customer service" with "Assisted 50+ clients daily and improved satisfaction by 15%".');
    }

    if (matched.length > 0) {
      recs.push(`Highlight Strengths: Place your experience with **${matched.slice(0, 2).join(' and ')}** near the top of your resume.`);
    }

    return recs;
  }
}
