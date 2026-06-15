import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ResumeParserService, ContactInfo } from './services/resume-parser.service';
import { AnalyzerService, AnalysisResult } from './services/analyzer.service';
import { HistoryService, HistoryRecord } from './services/history.service';
import { LatexGeneratorService } from './services/latex-generator.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // Inject services
  private parserService = inject(ResumeParserService);
  private analyzerService = inject(AnalyzerService);
  private historyService = inject(HistoryService);
  private latexService = inject(LatexGeneratorService);

  // Expose signals from services
  protected readonly tfStatus = this.analyzerService.modelStatus;
  protected readonly tfProgress = this.analyzerService.loadingProgress;
  protected readonly history = this.historyService.historyRecords;

  // Local state signals
  protected readonly activeTabIndex = signal<number>(0);
  protected readonly resumeName = signal<string>('');
  protected readonly jdText = signal<string>('');
  
  protected readonly isParsing = signal<boolean>(false);
  protected readonly isAnalyzing = signal<boolean>(false);
  protected readonly errorMsg = signal<string>('');
  
  protected readonly currentResult = signal<AnalysisResult | null>(null);
  protected readonly contactInfo = signal<ContactInfo | null>(null);
  protected readonly latexCode = signal<string>('');
  protected readonly selectedTemplate = signal<string>('technical');
  protected readonly currentTheme = signal<string>('dark');

  private resumeText = '';

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedTheme = localStorage.getItem('resume_analyser_theme') || 'dark';
      this.setTheme(savedTheme);
    }
  }

  protected setTheme(theme: string): void {
    this.currentTheme.set(theme);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('resume_analyser_theme', theme);
    }
    if (typeof document !== 'undefined') {
      const body = document.body;
      body.classList.remove('theme-dark', 'theme-light', 'theme-warm');
      body.classList.add(`theme-${theme}`);
    }
  }

  /**
   * Triggers TF.js model loading manually
   */
  protected triggerLoadModel(): void {
    this.analyzerService.loadModel();
  }

  /**
   * Handles file drop / file selection for the resume
   */
  protected onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target?.files?.[0];
    if (!file) return;

    this.processResumeFile(file);
  }

  protected onFileDropped(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processResumeFile(file);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private async processResumeFile(file: File): Promise<void> {
    if (file.type !== 'application/pdf') {
      this.errorMsg.set('Currently only PDF resumes are supported.');
      return;
    }

    this.errorMsg.set('');
    this.isParsing.set(true);
    this.resumeName.set(file.name);

    try {
      this.resumeText = await this.parserService.extractText(file);
      // Extract contact info details from parsed text
      const contact = this.parserService.parseContactInfo(this.resumeText);
      this.contactInfo.set(contact);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error parsing resume';
      this.errorMsg.set(msg);
      this.resumeName.set('');
      this.resumeText = '';
      this.contactInfo.set(null);
    } finally {
      this.isParsing.set(false);
    }
  }

  /**
   * Runs the resume & JD similarity analysis
   */
  protected async runAnalysis(): Promise<void> {
    if (!this.resumeText) {
      this.errorMsg.set('Please upload a resume first.');
      return;
    }
    if (!this.jdText().trim()) {
      this.errorMsg.set('Please provide a Job Description.');
      return;
    }

    this.errorMsg.set('');
    this.isAnalyzing.set(true);

    try {
      const result = await this.analyzerService.analyze(this.resumeText, this.jdText());
      this.currentResult.set(result);
      
      // Auto-generate LaTeX resume code template
      const contact = this.contactInfo() || { name: 'Your Name', email: 'your.email@example.com', phone: '+1-555-555-5555', linkedin: '', github: '' };
      const latex = this.latexService.generateLatex(this.selectedTemplate(), contact, result.matchedSkills, result.missingSkills);
      this.latexCode.set(latex);

      // Save run to local history
      this.historyService.saveRecord(this.resumeName(), this.jdText(), result);
      
      // Auto switch to Results tab
      this.activeTabIndex.set(1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
      this.errorMsg.set(msg);
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  /**
   * Triggered when the user changes the LaTeX resume style selection dropdown
   */
  protected onTemplateChanged(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const template = target?.value || 'technical';
    this.selectedTemplate.set(template);

    // Regenerate LaTeX template dynamically with the newly selected format style
    const result = this.currentResult();
    if (result) {
      const contact = this.contactInfo() || { name: 'Your Name', email: 'your.email@example.com', phone: '+1-555-555-5555', linkedin: '', github: '' };
      const latex = this.latexService.generateLatex(template, contact, result.matchedSkills, result.missingSkills);
      this.latexCode.set(latex);
    }
  }

  /**
   * Reloads a past run from history
   */
  protected viewHistoryRecord(record: HistoryRecord): void {
    this.currentResult.set(record.result);
    this.resumeName.set(record.resumeName);
    this.jdText.set(record.jdTitle); // set snippet preview in form field
    
    // Regenerate LaTeX template for selected history record using selected template style
    const contact = this.contactInfo() || { name: 'Your Name', email: 'your.email@example.com', phone: '+1-555-555-5555', linkedin: '', github: '' };
    const latex = this.latexService.generateLatex(this.selectedTemplate(), contact, record.result.matchedSkills, record.result.missingSkills);
    this.latexCode.set(latex);

    this.activeTabIndex.set(1); // navigate to Results
  }

  /**
   * Deletes a single history record
   */
  protected deleteHistory(id: string, event: Event): void {
    event.stopPropagation(); // prevent loading the deleted record
    this.historyService.deleteRecord(id);
  }

  /**
   * Clears the entire local history
   */
  protected clearAllHistory(): void {
    if (confirm('Are you sure you want to clear your local search history?')) {
      this.historyService.clearHistory();
    }
  }

  /**
   * Copy generated LaTeX code to system clipboard
   */
  protected copyLatexToClipboard(): void {
    if (!this.latexCode()) return;
    navigator.clipboard.writeText(this.latexCode()).then(() => {
      alert('LaTeX resume code template copied to clipboard!');
    });
  }

  /**
   * Download generated LaTeX template as a .tex file
   */
  protected downloadLatexFile(): void {
    if (!this.latexCode()) return;
    const blob = new Blob([this.latexCode()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = this.resumeName() ? this.resumeName().replace(/\.[^/.]+$/, "") : 'resume';
    a.href = url;
    a.download = `${baseName}_tailored_${this.selectedTemplate()}.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export the analysis data as a downloadable JSON file
   */
  protected downloadJsonReport(): void {
    const result = this.currentResult();
    if (!result) return;
    const report = {
      resumeName: this.resumeName(),
      contactInfo: this.contactInfo(),
      metrics: {
        atsScore: result.atsScore,
        semanticMatchScore: result.matchScore,
        keywordMatchRate: result.keywordMatchRate,
        keywordDensity: result.keywordDensity
      },
      skills: {
        matched: result.matchedSkills,
        missing: result.missingSkills
      },
      breakdown: result.breakdown,
      weakSignals: result.weakSignals,
      recommendations: result.recommendations,
      analyzedAt: result.analyzedAt
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ats_report_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Copies a text summary snapshot to clipboard
   */
  protected copyReportSummary(): void {
    const result = this.currentResult();
    if (!result) return;
    const summary = `--- Resume ATS Analysis Snapshot ---
Date: ${result.analyzedAt}
Resume: ${this.resumeName()}
ATS compatibility Score: ${result.atsScore}%
Semantic Similarity Match: ${result.matchScore}%
Skill Competency Coverage: ${result.keywordMatchRate}%
Impact Score: ${result.keywordDensity}%

Matched Competencies: ${result.matchedSkills.join(', ') || 'None'}
Missing Competencies: ${result.missingSkills.join(', ') || 'None'}

Weak Signals:
${result.weakSignals.map(s => `- ${s}`).join('\n') || 'None'}

Recommendations:
${result.recommendations.map(r => `- ${r.replace(/\*\*/g, '')}`).join('\n')}
------------------------------------`;

    navigator.clipboard.writeText(summary).then(() => {
      alert('Analysis snapshot copied to clipboard!');
    });
  }

  /**
   * Opens browser print panel (formatted via print stylesheet)
   */
  protected printReport(): void {
    window.print();
  }
}
