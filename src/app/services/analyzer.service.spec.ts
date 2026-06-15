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

  it('should analyze text and compute semantic, ATS, and explainability metrics', async () => {
    const resumeText = 'Jaimin Vadadoriya is a Frontend Engineer specializing in Angular and TypeScript. Email: test@example.com Phone: 1234567890';
    const jdText = 'Looking for an Angular developer with experience in TypeScript and React.';

    const result = await service.analyze(resumeText, jdText);

    expect(result).toBeTruthy();
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);

    // ATS compatibility metrics
    expect(result.atsScore).toBeGreaterThanOrEqual(0);
    expect(result.atsScore).toBeLessThanOrEqual(100);
    expect(result.keywordMatchRate).toBe(67); // Angular & TS matched, React missing (2/3 = 66.67%)
    expect(result.keywordDensity).toBeGreaterThan(0);

    // Skill extraction (aliases mapped)
    expect(result.matchedSkills).toContain('Angular');
    expect(result.matchedSkills).toContain('TypeScript');
    expect(result.missingSkills).toContain('React');

    // Explainability breakdown
    expect(result.breakdown).toBeDefined();
    expect(result.breakdown.length).toBeGreaterThan(0);
    
    const factors = result.breakdown.map(b => b.factor);
    expect(factors).toContain('Semantic Alignment');
    expect(factors).toContain('Skill Keyword Coverage');
    expect(factors).toContain('Keyword Density');
    expect(factors).toContain('ATS Formatting & Info');

    // Recommendations list should be populated
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
