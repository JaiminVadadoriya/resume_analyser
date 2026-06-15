import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AnalyzerService } from './analyzer.service';

// Mock TensorFlow.js backend preparation
vi.mock('@tensorflow/tfjs', () => {
  return {
    ready: () => Promise.resolve()
  };
});

// Mock Universal Sentence Encoder model
vi.mock('@tensorflow-models/universal-sentence-encoder', () => {
  return {
    load: () => Promise.resolve({
      embed: () => {
        return {
          array: () => Promise.resolve([
            new Array(512).fill(0).map((_, i) => (i === 0 ? 1.0 : 0.0)),
            new Array(512).fill(0).map((_, i) => (i === 0 ? 0.9 : 0.0)) // High cosine similarity
          ]),
          dispose: () => { /* mock: no-op tensor disposal */ }
        };
      }
    })
  };
});

describe('AnalyzerService', () => {
  let service: AnalyzerService;

  beforeEach(() => {
    service = new AnalyzerService();
  });

  it('should be created in idle state and support lazy loading', async () => {
    expect(service).toBeTruthy();
    expect(service.modelStatus()).toBe('idle');
    
    // Warm up the model manually
    await service.loadModel();
    expect(service.modelStatus()).toBe('loaded');
  });

  it('should analyze text and compute semantic, ATS, explainability, and weak signal metrics', async () => {
    const resumeText = 'Jaimin Vadadoriya is a Software Engineer specializing in software development. Email: test@example.com Phone: 1234567890';
    const jdText = 'Looking for an engineer to lead projects, manage team milestones, and write code.';

    const result = await service.analyze(resumeText, jdText);

    expect(result).toBeTruthy();
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);

    // ATS compatibility metrics
    expect(result.atsScore).toBeGreaterThanOrEqual(0);
    expect(result.atsScore).toBeLessThanOrEqual(100);
    expect(result.keywordMatchRate).toBe(17); // Software Development matched, others missing
    expect(result.keywordDensity).toBeDefined(); // Impact Score

    // Competency extraction (universal taxonomy)
    expect(result.matchedSkills).toContain('Software Development');
    expect(result.missingSkills).toContain('Leadership & Team Management');

    // Explainability breakdown
    expect(result.breakdown).toBeDefined();
    expect(result.breakdown.length).toBeGreaterThan(0);
    
    const factors = result.breakdown.map(b => b.factor);
    expect(factors).toContain('Competency Alignment');
    expect(factors).toContain('Experience Relevance');
    expect(factors).toContain('Impact & Outcomes');
    expect(factors).toContain('Resume Quality & Structure');

    // Weak signals should be detected (due to lack of metrics/outcome numbers)
    expect(result.weakSignals.length).toBeGreaterThan(0);
    expect(result.weakSignals[0]).toContain('quantified outcomes');

    // Recommendations list should be populated
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should utilize the embedding cache for identical text inputs', async () => {
    const text1 = 'This is a test resume content for caching.';
    const text2 = 'This is a test job description for caching.';

    const cache = (service as unknown as { embeddingCache: Map<string, number[]> }).embeddingCache;
    cache.clear();

    // First analysis: populates cache
    await service.analyze(text1, text2);
    expect(cache.size).toBe(2);

    // Second analysis: reuses cache (verify size does not increase)
    await service.analyze(text1, text2);
    expect(cache.size).toBe(2);
  });
});
