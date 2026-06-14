// @vitest-environment jsdom
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

// Redirect all pdfjs-dist imports to the node-safe legacy build during Vitest runs
vi.mock('pdfjs-dist', () => {
  return import('pdfjs-dist/legacy/build/pdf.mjs');
});

// Mock @angular/core to dynamically patch Component decorator and inline assets
vi.mock('@angular/core', async (importOriginal) => {
  interface ComponentMeta { templateUrl?: string; template?: string; styleUrl?: string; styles?: string[] }
  interface NgCoreModule extends Record<string, unknown> {
    Component: (metadata: ComponentMeta) => ClassDecorator;
  }
  const original = await importOriginal<NgCoreModule>();
  const fs = await import('fs');
  const path = await import('path');
  
  return {
    ...original,
    Component: (metadata: { templateUrl?: string; template?: string; styleUrl?: string; styles?: string[] }) => {
      if (metadata) {
        if (metadata.templateUrl) {
          try {
            const resolvedPath = path.resolve(__dirname, metadata.templateUrl);
            metadata.template = fs.readFileSync(resolvedPath, 'utf8');
            delete metadata.templateUrl;
          } catch (e) {
            console.error('Failed to inline template in mock:', e);
          }
        }
        if (metadata.styleUrl) {
          try {
            const resolvedPath = path.resolve(__dirname, metadata.styleUrl);
            metadata.styles = [fs.readFileSync(resolvedPath, 'utf8')];
            delete metadata.styleUrl;
          } catch (e) {
            console.error('Failed to inline style in mock:', e);
          }
        }
      }
      return original.Component(metadata);
    }
  };
});

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { App } from './app';
import { ResumeParserService } from './services/resume-parser.service';
import { AnalyzerService } from './services/analyzer.service';
import { HistoryService } from './services/history.service';

// Initialize the Angular testing environment (only once)
try {
  TestBed.resetTestEnvironment();
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting()
  );
} catch {
  // Suppress duplicate-init errors when test files are re-evaluated
}

// Mocks for services to prevent TensorFlow.js model load and PDF worker loading in test context
class MockResumeParserService {}
class MockHistoryService {
  historyRecords = signal([]);
}
class MockAnalyzerService {
  modelStatus = signal('loaded');
  loadingProgress = signal(100);
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: ResumeParserService, useClass: MockResumeParserService },
        { provide: AnalyzerService, useClass: MockAnalyzerService },
        { provide: HistoryService, useClass: MockHistoryService }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('RESUME.ANALYSER');
  });
});
