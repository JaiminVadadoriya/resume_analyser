import { Injectable, signal } from '@angular/core';
import { AnalysisResult } from './analyzer.service';

export interface HistoryRecord {
  id: string;
  resumeName: string;
  jdTitle: string;
  result: AnalysisResult;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private readonly STORAGE_KEY = 'resume_analyser_history';
  
  // Reactively track history lists across the application
  historyRecords = signal<HistoryRecord[]>([]);

  constructor() {
    this.loadHistory();
  }

  /**
   * Loads past runs from localStorage into state
   */
  loadHistory(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        this.historyRecords.set(JSON.parse(data));
      } else {
        this.historyRecords.set([]);
      }
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      this.historyRecords.set([]);
    }
  }

  /**
   * Saves a new record
   */
  saveRecord(resumeName: string, jdText: string, result: AnalysisResult): void {
    // Generate a user-friendly job title/snippet from the Job Description
    const jdTitle = jdText.trim().substring(0, 40) + (jdText.length > 40 ? '...' : '');

    const record: HistoryRecord = {
      id: Math.random().toString(36).substring(2, 11) + Date.now(),
      resumeName: resumeName || 'Uploaded Resume',
      jdTitle,
      result
    };

    const updated = [record, ...this.historyRecords()];
    this.historyRecords.set(updated);
    this.persist(updated);
  }

  /**
   * Deletes a specific record
   */
  deleteRecord(id: string): void {
    const updated = this.historyRecords().filter(r => r.id !== id);
    this.historyRecords.set(updated);
    this.persist(updated);
  }

  /**
   * Clears all history
   */
  clearHistory(): void {
    this.historyRecords.set([]);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private persist(records: HistoryRecord[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('Failed to write to localStorage:', error);
    }
  }
}
