import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

@Injectable({
  providedIn: 'root'
})
export class ResumeParserService {
  constructor() {
    // Only set workerSrc if not already configured and we are in a browser environment
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
      const globalProcess = (globalThis as unknown as { process?: { versions?: { node?: unknown } } }).process;
      const isNode = typeof globalProcess !== 'undefined' && globalProcess.versions && globalProcess.versions.node;

      if (isBrowser && !isNode) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      }
    }
  }

  /**
   * Reads a File (PDF) and extracts all its plain text content.
   */
  async extractText(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let text = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => (item as { str?: string }).str || '')
          .join(' ');
        text += pageText + '\n';
      }

      return text.trim();
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Could not parse the PDF file. Please ensure it is a valid, unencrypted PDF.', { cause: error });
    }
  }
}
