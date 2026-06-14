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

import { ResumeParserService } from './services/resume-parser.service';
import { AnalyzerService, AnalysisResult } from './services/analyzer.service';
import { HistoryService, HistoryRecord } from './services/history.service';

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

  private resumeText = '';

  /**
   * Triggers TF.js model loading manually if needed (already warms up on init)
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error parsing resume';
      this.errorMsg.set(msg);
      this.resumeName.set('');
      this.resumeText = '';
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
   * Reloads a past run from history
   */
  protected viewHistoryRecord(record: HistoryRecord): void {
    this.currentResult.set(record.result);
    this.resumeName.set(record.resumeName);
    this.jdText.set(record.jdTitle); // set snippet preview in form field
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
}
