import { Injectable, signal } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

export interface AnalysisResult {
  matchScore: number; // percentage (0-100)
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  analyzedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyzerService {
  private model: use.UniversalSentenceEncoder | null = null;
  
  // Reactively track loading state
  modelStatus = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  loadingProgress = signal<number>(0);

  // Broad catalog of tech skills for analysis
  private readonly SKILL_CATALOG = [
    // Frontend
    'Angular', 'React', 'Vue', 'Next.js', 'Nuxt', 'Svelte', 'HTML', 'CSS', 'JavaScript', 
    'TypeScript', 'Tailwind', 'Sass', 'Bootstrap', 'RxJS', 'Redux', 'Webpack', 'Vite',
    // Backend
    'Node.js', 'Express', 'NestJS', 'Python', 'Django', 'Flask', 'FastAPI', 'Java', 
    'Spring Boot', 'Go', 'Golang', 'Ruby', 'Ruby on Rails', 'C#', '.NET', 'PHP', 'Laravel',
    // Databases
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Firebase', 'DynamoDB', 'SQLite', 'Oracle', 'Cassandra',
    // DevOps & Cloud
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'GitHub', 'Jenkins', 
    'Terraform', 'Vercel', 'Netlify', 'Linux',
    // AI/Data
    'TensorFlow', 'PyTorch', 'Machine Learning', 'Deep Learning', 'NLP', 'LLM', 'Data Science', 
    'Pandas', 'NumPy', 'Scikit-learn', 'OpenAI',
    // Other / Architecture
    'Agile', 'Scrum', 'REST API', 'GraphQL', 'Microservices', 'System Design', 'Unit Testing', 
    'Cypress', 'Jest', 'Vitest', 'SQL', 'NoSQL'
  ];

  constructor() {
    // Warm up the model early
    this.loadModel();
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

      // Load USE model locally (binary shards) + vocab from Google Storage
      // The vocab.json (218 KB) is fetched from GCS which has permissive CORS headers,
      // avoiding the Vite dev-server fs.allow restriction on .json files.
      this.model = await use.load({
        modelUrl: '/models/use-lite/model.json',
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
   * Analyzes the match between resume and job description.
   */
  async analyze(resumeText: string, jdText: string): Promise<AnalysisResult> {
    if (!this.model) {
      await this.loadModel();
      if (!this.model) {
        throw new Error('Analysis engine could not be initialized.');
      }
    }

    // 1. Calculate Semantic Match Score via Cosine Similarity of sentence embeddings
    const matchScore = await this.calculateSimilarity(resumeText, jdText);

    // 2. Perform Skill Gap Analysis
    const { matchedSkills, missingSkills } = this.extractSkillGaps(resumeText, jdText);

    // 3. Generate Actionable Recommendations
    const recommendations = this.generateRecommendations(matchScore, matchedSkills, missingSkills);

    return {
      matchScore,
      matchedSkills,
      missingSkills,
      recommendations,
      analyzedAt: new Date().toLocaleString()
    };
  }

  /**
   * Embeds texts and calculates their Cosine Similarity.
   */
  private async calculateSimilarity(text1: string, text2: string): Promise<number> {
    if (!this.model) return 0;

    // Use clean sentences or full chunks. We embed both texts as unified documents.
    const embeddings = await this.model.embed([text1, text2]);
    const embeddingData = await embeddings.array();
    
    // Clean up tensors to prevent memory leaks in TFjs
    embeddings.dispose();

    const vecA = embeddingData[0];
    const vecB = embeddingData[1];

    // Compute dot product and L2 norms
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
    
    // Scale similarity to a human-friendly match score percentage.
    // Semantic similarity from USE usually sits between 0.3 (very different) and 0.9+ (extremely close).
    // Let's normalize it to a range of 0% - 100%.
    const minSim = 0.2;
    const maxSim = 0.85;
    let normalized = (similarity - minSim) / (maxSim - minSim);
    normalized = Math.max(0, Math.min(1, normalized)); // clamp to [0, 1]

    return Math.round(normalized * 100);
  }

  /**
   * Identifies skills requested in JD and checks if they exist in the resume.
   */
  private extractSkillGaps(resumeText: string, jdText: string): { matchedSkills: string[], missingSkills: string[] } {
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    // Simple word boundary matcher for precise matches
    const containsSkill = (text: string, skill: string): boolean => {
      // Escape special regex chars like . or + in C++ or .NET
      const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(text);
    };

    for (const skill of this.SKILL_CATALOG) {
      const isReqInJd = containsSkill(jdText, skill);
      if (isReqInJd) {
        const isPresentInResume = containsSkill(resumeText, skill);
        if (isPresentInResume) {
          matchedSkills.push(skill);
        } else {
          missingSkills.push(skill);
        }
      }
    }

    return { matchedSkills, missingSkills };
  }

  /**
   * Dynamically constructs recommendations based on analysis results.
   */
  private generateRecommendations(score: number, matched: string[], missing: string[]): string[] {
    const recs: string[] = [];

    if (score >= 80) {
      recs.push('Excellent match! Your resume aligns highly with the job description.');
    } else if (score >= 50) {
      recs.push('Good baseline alignment. Adding a few key skills from the job description could boost your score.');
    } else {
      recs.push('Low initial alignment. Consider tailoring your resume significantly to address the requirements.');
    }

    if (missing.length > 0) {
      const topMissing = missing.slice(0, 3).join(', ');
      recs.push(`Target missing core keywords: Incorporate **${topMissing}** if you have experience with them.`);
    }

    if (matched.length === 0) {
      recs.push('No matching tech stack skills found. Check if your resume uses standard naming conventions for tools.');
    } else {
      recs.push(`You have strong matches for **${matched.slice(0, 3).join(', ')}**. Make sure to highlight these projects prominently.`);
    }

    return recs;
  }
}
