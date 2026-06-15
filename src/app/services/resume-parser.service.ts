import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
}

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

  /**
   * Parses contact details (name, email, phone, social links) from the resume plain text.
   */
  parseContactInfo(text: string): ContactInfo {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}(?:[-.\s]?\d{3,5})?/);
    const githubMatch = text.match(/https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i);
    const linkedinMatch = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let name = 'Candidate Name';

    if (lines.length > 0) {
      const firstLineParts = lines[0].split(/\s{2,}/);
      if (firstLineParts.length > 0 && firstLineParts[0].length > 2) {
        const potentialName = firstLineParts[0].trim();
        if (!potentialName.includes('@') && !potentialName.toLowerCase().includes('http') && !potentialName.toLowerCase().includes('resume')) {
          name = potentialName;
        }
      }
    }

    return {
      name,
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      linkedin: linkedinMatch ? linkedinMatch[0] : '',
      github: githubMatch ? githubMatch[0] : ''
    };
  }
}
