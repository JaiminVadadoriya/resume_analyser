import { Injectable, signal } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

export interface SkillDefinition {
  name: string;
  aliases: string[];
}

export interface ScoreContribution {
  factor: string;
  contribution: number;
  description: string;
}

export interface AnalysisResult {
  matchScore: number;
  atsScore: number;
  keywordMatchRate: number;
  keywordDensity: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  breakdown: ScoreContribution[];
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

  // Broad catalog of tech skills with aliases for extraction matching
  private readonly SKILL_CATALOG: SkillDefinition[] = [
    // Frontend
    { name: 'Angular', aliases: ['AngularJS', 'Angular 2+', 'Angular 22', 'Angular v22'] },
    { name: 'React', aliases: ['ReactJS', 'React.js'] },
    { name: 'Vue', aliases: ['VueJS', 'Vue.js'] },
    { name: 'Next.js', aliases: ['NextJS', 'Next'] },
    { name: 'Nuxt', aliases: ['NuxtJS', 'Nuxt.js'] },
    { name: 'Svelte', aliases: ['SvelteKit'] },
    { name: 'HTML', aliases: ['HTML5'] },
    { name: 'CSS', aliases: ['CSS3'] },
    { name: 'JavaScript', aliases: ['JS', 'ES6', 'EcmaScript'] },
    { name: 'TypeScript', aliases: ['TS'] },
    { name: 'Tailwind', aliases: ['TailwindCSS', 'Tailwind CSS'] },
    { name: 'Sass', aliases: ['SCSS'] },
    { name: 'Bootstrap', aliases: [] },
    { name: 'RxJS', aliases: [] },
    { name: 'Redux', aliases: ['Redux Toolkit'] },
    { name: 'Webpack', aliases: [] },
    { name: 'Vite', aliases: [] },
    
    // Backend
    { name: 'Node.js', aliases: ['NodeJS', 'Node'] },
    { name: 'Express', aliases: ['ExpressJS', 'Express.js'] },
    { name: 'NestJS', aliases: ['Nest'] },
    { name: 'Python', aliases: ['Python3'] },
    { name: 'Django', aliases: [] },
    { name: 'Flask', aliases: [] },
    { name: 'FastAPI', aliases: [] },
    { name: 'Java', aliases: [] },
    { name: 'Spring Boot', aliases: ['Spring'] },
    { name: 'Go', aliases: ['Golang'] },
    { name: 'Ruby', aliases: [] },
    { name: 'Ruby on Rails', aliases: ['Rails'] },
    { name: 'C#', aliases: ['CSharp', '.NET'] },
    { name: 'PHP', aliases: [] },
    { name: 'Laravel', aliases: [] },
    
    // Databases
    { name: 'PostgreSQL', aliases: ['Postgres'] },
    { name: 'MySQL', aliases: [] },
    { name: 'MongoDB', aliases: ['Mongo'] },
    { name: 'Redis', aliases: [] },
    { name: 'Firebase', aliases: [] },
    { name: 'DynamoDB', aliases: [] },
    { name: 'SQLite', aliases: [] },
    { name: 'Oracle', aliases: [] },
    { name: 'Cassandra', aliases: [] },
    
    // DevOps & Cloud
    { name: 'AWS', aliases: ['Amazon Web Services'] },
    { name: 'Azure', aliases: ['Microsoft Azure'] },
    { name: 'GCP', aliases: ['Google Cloud', 'Google Cloud Platform'] },
    { name: 'Docker', aliases: ['Docker Containers'] },
    { name: 'Kubernetes', aliases: ['K8s'] },
    { name: 'CI/CD', aliases: ['GitHub Actions', 'Jenkins', 'GitLab CI'] },
    { name: 'Git', aliases: ['GitHub', 'GitLab'] },
    { name: 'Terraform', aliases: [] },
    { name: 'Vercel', aliases: [] },
    { name: 'Netlify', aliases: [] },
    { name: 'Linux', aliases: [] },
    
    // AI/Data
    { name: 'TensorFlow', aliases: ['TF', 'TF.js'] },
    { name: 'PyTorch', aliases: [] },
    { name: 'Machine Learning', aliases: ['ML'] },
    { name: 'Deep Learning', aliases: ['DL'] },
    { name: 'NLP', aliases: ['Natural Language Processing'] },
    { name: 'LLM', aliases: ['Large Language Models'] },
    { name: 'Data Science', aliases: [] },
    { name: 'Pandas', aliases: [] },
    { name: 'NumPy', aliases: [] },
    { name: 'Scikit-learn', aliases: ['Sklearn'] },
    { name: 'OpenAI', aliases: ['ChatGPT'] },
    
    // Other / Architecture
    { name: 'Agile', aliases: ['Scrum'] },
    { name: 'REST API', aliases: ['RESTful', 'RESTful API'] },
    { name: 'GraphQL', aliases: [] },
    { name: 'Microservices', aliases: [] },
    { name: 'System Design', aliases: [] },
    { name: 'Unit Testing', aliases: ['Jest', 'Vitest', 'Jasmine'] },
    { name: 'Cypress', aliases: ['Playwright'] },
    { name: 'SQL', aliases: ['NoSQL'] }
  ];

  constructor() {
    // Model loading is now lazy-loaded on the first analysis or manual trigger
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
    // 1. Calculate Semantic Match Score via Cosine Similarity of sentence embeddings
    const vecA = await this.getEmbedding(resumeText);
    const vecB = await this.getEmbedding(jdText);
    const matchScore = this.calculateCosineSimilarity(vecA, vecB);

    // 2. Perform Skill Gap Analysis
    const { matchedSkills, missingSkills, keywordMatchRate } = this.extractSkillGaps(resumeText, jdText);

    // 3. Calculate Keyword Density
    const keywordDensity = this.calculateKeywordDensity(resumeText, matchedSkills);

    // 4. Calculate ATS compatibility score & Explainability Breakdown
    const { atsScore, breakdown } = this.calculateAtsScore(matchScore, keywordMatchRate, keywordDensity, resumeText, jdText, missingSkills);

    // 5. Generate Actionable Recommendations
    const recommendations = this.generateRecommendations(atsScore, matchedSkills, missingSkills);

    return {
      matchScore,
      atsScore,
      keywordMatchRate,
      keywordDensity,
      matchedSkills,
      missingSkills,
      recommendations,
      breakdown,
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
   * Identifies skills requested in JD and checks if they exist in the resume.
   */
  private extractSkillGaps(resumeText: string, jdText: string): { matchedSkills: string[], missingSkills: string[], keywordMatchRate: number } {
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    let requiredSkillsCount = 0;

    const containsSkill = (text: string, skillDef: SkillDefinition): boolean => {
      const terms = [skillDef.name, ...skillDef.aliases];
      return terms.some(term => {
        const escaped = term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        // Lookbehind and lookahead to handle symbol-containing terms like C# and .NET cleanly
        const regex = new RegExp(`(?<=^|[^a-zA-Z0-9])${escaped}(?=$|[^a-zA-Z0-9])`, 'i');
        return regex.test(text);
      });
    };

    for (const skill of this.SKILL_CATALOG) {
      const isReqInJd = containsSkill(jdText, skill);
      if (isReqInJd) {
        requiredSkillsCount++;
        const isPresentInResume = containsSkill(resumeText, skill);
        if (isPresentInResume) {
          matchedSkills.push(skill.name);
        } else {
          missingSkills.push(skill.name);
        }
      }
    }

    const keywordMatchRate = requiredSkillsCount > 0 
      ? Math.round((matchedSkills.length / requiredSkillsCount) * 100) 
      : 100;

    return { matchedSkills, missingSkills, keywordMatchRate };
  }

  /**
   * Computes the keyword density percentage in the resume
   */
  private calculateKeywordDensity(resumeText: string, matchedSkills: string[]): number {
    const resumeWords = resumeText.split(/\s+/).filter(w => w.length > 0).length;
    if (resumeWords === 0) return 0;

    let keywordOccurrenceCount = 0;
    for (const skill of matchedSkills) {
      const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(?<=^|[^a-zA-Z0-9])${escaped}(?=$|[^a-zA-Z0-9])`, 'gi');
      const matches = resumeText.match(regex);
      if (matches) {
        keywordOccurrenceCount += matches.length;
      }
    }

    return (keywordOccurrenceCount / resumeWords) * 100;
  }

  /**
   * Computes the overall ATS score and the explainability breakdown
   */
  private calculateAtsScore(
    matchScore: number,
    keywordMatchRate: number,
    keywordDensity: number,
    resumeText: string,
    jdText: string,
    missingSkills: string[]
  ): { atsScore: number, breakdown: ScoreContribution[] } {
    // 1. Semantic Match Score (40% weight)
    const semanticWeight = matchScore * 0.4;

    // 2. Keyword Match Rate (40% weight)
    const skillWeight = keywordMatchRate * 0.4;

    // 3. Keyword Density (10% weight)
    let densityPoints = 1;
    let densityDesc = `Low density (${keywordDensity.toFixed(1)}%). Optimal range is 1.5% - 3.5%.`;
    if (keywordDensity >= 1.5 && keywordDensity <= 3.5) {
      densityPoints = 10;
      densityDesc = `Optimal keyword density (${keywordDensity.toFixed(1)}%). Excellent!`;
    } else if ((keywordDensity >= 1.0 && keywordDensity < 1.5) || (keywordDensity > 3.5 && keywordDensity <= 5.0)) {
      densityPoints = 7;
      densityDesc = `Fair keyword density (${keywordDensity.toFixed(1)}%). Optimal range is 1.5% - 3.5%.`;
    } else if ((keywordDensity >= 0.5 && keywordDensity < 1.0) || (keywordDensity > 5.0 && keywordDensity <= 7.5)) {
      densityPoints = 4;
      densityDesc = `Sub-optimal keyword density (${keywordDensity.toFixed(1)}%). Try to adjust keywords.`;
    }

    // 4. Formatting & Contact Info (10% weight)
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeText);
    const hasPhone = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{4,5}/.test(resumeText);
    
    let formatPoints = 0;
    if (hasEmail && hasPhone) formatPoints = 10;
    else if (hasEmail || hasPhone) formatPoints = 5;

    const formatDesc = `Contact Details: Email (${hasEmail ? 'Found' : 'Missing'}), Phone (${hasPhone ? 'Found' : 'Missing'}).`;

    // 5. Critical Missing Skills Penalty (Maximum -15 points)
    const criticalMissing: string[] = [];
    for (const skill of missingSkills) {
      const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(?<=^|[^a-zA-Z0-9])${escaped}(?=$|[^a-zA-Z0-9])`, 'gi');
      const matches = jdText.match(regex);
      if (matches && matches.length >= 2) {
        criticalMissing.push(skill);
      }
    }
    const penalty = Math.min(15, criticalMissing.length * 3);

    const baseScore = semanticWeight + skillWeight + densityPoints + formatPoints;
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore - penalty)));

    const breakdown: ScoreContribution[] = [
      {
        factor: 'Semantic Alignment',
        contribution: Math.round(semanticWeight),
        description: 'Evaluates general contextual alignment with the role responsibilities.'
      },
      {
        factor: 'Skill Keyword Coverage',
        contribution: Math.round(skillWeight),
        description: 'Percentage of job-required technical skills found in your resume.'
      },
      {
        factor: 'Keyword Density',
        contribution: densityPoints,
        description: densityDesc
      },
      {
        factor: 'ATS Formatting & Info',
        contribution: formatPoints,
        description: formatDesc
      }
    ];

    if (penalty > 0) {
      breakdown.push({
        factor: 'Critical Gaps Penalty',
        contribution: -penalty,
        description: `Omitted core skills heavily requested in the Job Description: ${criticalMissing.slice(0, 3).join(', ')}.`
      });
    }

    return { atsScore: finalScore, breakdown };
  }

  /**
   * Dynamically constructs recommendations based on ATS scores and gaps.
   */
  private generateRecommendations(score: number, matched: string[], missing: string[]): string[] {
    const recs: string[] = [];

    if (score >= 80) {
      recs.push('Excellent ATS readiness! Your resume is highly compatible with the target position.');
    } else if (score >= 60) {
      recs.push('Strong potential. Addressing missing skill gaps and adjusting keyword density can help you pass strict ATS filters.');
    } else {
      recs.push('Low ATS compatibility. Tailor your experience details and highlight matching keywords prominently.');
    }

    if (missing.length > 0) {
      const topMissing = missing.slice(0, 3).join(', ');
      recs.push(`Action Item: Integrate the missing keywords **${topMissing}** into your experience bullets or skills section.`);
    }

    if (matched.length === 0) {
      recs.push('Critical: No matching technical stack keywords found. Review your resume to ensure you use standard tech naming conventions.');
    } else {
      recs.push(`Strength: Your experience in **${matched.slice(0, 3).join(', ')}** matches core job demands. Mention specific project accomplishments using these.`);
    }

    return recs;
  }
}
