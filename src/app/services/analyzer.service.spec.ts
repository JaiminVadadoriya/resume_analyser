import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AnalyzerService } from './analyzer.service';

// Mock TensorFlow.js backend preparation
vi.mock('@tensorflow/tfjs', () => {
  return {
    ready: () => Promise.resolve()
  };
});

// Mock Universal Sentence Encoder model — never actually fetches model files,
// so document.baseURI being 'about:blank' in jsdom is harmless.
vi.mock('@tensorflow-models/universal-sentence-encoder', () => {
  return {
    load: () => Promise.resolve({
      embed: () => {
        return {
          array: () => Promise.resolve([
            new Array(512).fill(0).map((_, i) => (i === 0 ? 1.0 : 0.0)),
            new Array(512).fill(0).map((_, i) => (i === 0 ? 0.9 : 0.0)) // High cosine similarity (~0.9)
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

  it('should be created and warm up the model', async () => {
    expect(service).toBeTruthy();
    // Warmup is triggered in constructor, check if loaded/loading state resolves
    await service.loadModel();
    expect(service.modelStatus()).toBe('loaded');
  });

  it('should analyze text and extract match score and skills', async () => {
    const resumeText = 'Jaimin Vadadoriya is a Frontend Engineer specializing in Angular and TypeScript.';
    const jdText = 'Looking for an Angular developer with experience in TypeScript and React.';

    const result = await service.analyze(resumeText, jdText);

    expect(result).toBeTruthy();
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);

    // Angular and TypeScript are in both
    expect(result.matchedSkills).toContain('Angular');
    expect(result.matchedSkills).toContain('TypeScript');

    // React is in JD but missing in Resume
    expect(result.missingSkills).toContain('React');

    // Recommendations list should be populated
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
