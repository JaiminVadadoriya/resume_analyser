// @vitest-environment jsdom
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { HistoryService } from './history.service';
import { AnalysisResult } from './analyzer.service';

// In-memory localStorage mock — needed because the per-file jsdom instance
// does not inherit the url from vitest.config.ts environmentOptions,
// leaving the origin as about:blank (opaque) where localStorage is blocked.
const makeLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
};

describe('HistoryService', () => {
  let service: HistoryService;
  const STORAGE_KEY = 'resume_analyser_history';

  const mockResult: AnalysisResult = {
    matchScore: 85,
    matchedSkills: ['Angular', 'TypeScript'],
    missingSkills: ['React'],
    recommendations: ['Nice match'],
    analyzedAt: new Date().toLocaleString()
  };

  beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorageMock());
    service = new HistoryService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should be created and have empty initial history', () => {
    expect(service).toBeTruthy();
    expect(service.historyRecords().length).toBe(0);
  });

  it('should save analysis record and load it from localStorage', () => {
    service.saveRecord('Jaimin_Resume.pdf', 'Target Angular role text', mockResult);

    expect(service.historyRecords().length).toBe(1);
    expect(service.historyRecords()[0].resumeName).toBe('Jaimin_Resume.pdf');
    expect(service.historyRecords()[0].result.matchScore).toBe(85);

    // Verify localStorage persistence
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].resumeName).toBe('Jaimin_Resume.pdf');
  });

  it('should delete a record from history', () => {
    service.saveRecord('Resume1.pdf', 'Job 1', mockResult);
    service.saveRecord('Resume2.pdf', 'Job 2', mockResult);

    expect(service.historyRecords().length).toBe(2);

    const recordToDelete = service.historyRecords()[1]; // Resume1.pdf
    service.deleteRecord(recordToDelete.id);

    expect(service.historyRecords().length).toBe(1);
    expect(service.historyRecords()[0].resumeName).toBe('Resume2.pdf'); // Resume2.pdf should remain
  });

  it('should clear all records from history', () => {
    service.saveRecord('Resume1.pdf', 'Job 1', mockResult);
    service.saveRecord('Resume2.pdf', 'Job 2', mockResult);

    expect(service.historyRecords().length).toBe(2);

    service.clearHistory();

    expect(service.historyRecords().length).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
