// @vitest-environment jsdom
import { describe, beforeEach, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { type ResumeParserService } from './resume-parser.service';

const PDF_PATH = path.resolve(__dirname, '../../../test/Resume.pdf');
const PDF_AVAILABLE = fs.existsSync(PDF_PATH);

// Redirect all pdfjs-dist imports to the node-safe legacy build during Vitest runs
vi.mock('pdfjs-dist', () => {
  return import('pdfjs-dist/legacy/build/pdf.mjs');
});

describe('ResumeParserService', () => {
  let service: ResumeParserService;

  beforeEach(async () => {
    // Dynamically load pdfjs-dist to configure local file worker for Vitest run
    const pdfjsLib = await import('pdfjs-dist');
    const workerFilePath = path.resolve(__dirname, '../../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
    
    // Set local file path as worker src to avoid network protocol restrictions in JSDOM
    pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerFilePath}`;

    const { ResumeParserService: ParserClass } = await import('./resume-parser.service');
    service = new ParserClass();
  });

  it.skipIf(!PDF_AVAILABLE)('should extract text from Resume.pdf', async () => {
    // Read the actual PDF file from the test folder
    const pdfPath = path.resolve(__dirname, '../../../test/Resume.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    // Create a mock File object using Node buffer
    const mockFile = new File([pdfBuffer], 'Resume.pdf', {
      type: 'application/pdf'
    });

    // JSDOM File/Blob doesn't always implement arrayBuffer(), polyfill it for JSDOM test context
    if (typeof mockFile.arrayBuffer !== 'function') {
      mockFile.arrayBuffer = async () => {
        // Construct the ArrayBuffer using the JSDOM realm constructors to pass prototype checks
        const RealmArrayBuffer = (globalThis as unknown as { ArrayBuffer: typeof ArrayBuffer }).ArrayBuffer || ArrayBuffer;
        const RealmUint8Array = (globalThis as unknown as { Uint8Array: typeof Uint8Array }).Uint8Array || Uint8Array;
        
        const buf = new RealmArrayBuffer(pdfBuffer.length);
        const view = new RealmUint8Array(buf);
        for (let i = 0; i < pdfBuffer.length; i++) {
          view[i] = pdfBuffer[i];
        }
        return buf;
      };
    }

    const text = await service.extractText(mockFile);
    
    // Verify that the parser returned some content
    expect(text).toBeTruthy();
    expect(text.length).toBeGreaterThan(0);
    
    // Check if the name of the candidate is found in the parsed text
    expect(text).toContain('Jaimin');
    
    // Test the parseContactInfo extraction logic
    const contact = service.parseContactInfo(text);
    expect(contact).toBeTruthy();
    expect(contact.name).toBe('Jaimin Vadadoriya');
    expect(contact.email).toBe('vadadoriyajaimin@gmail.com');
    expect(contact.phone).toBe('+91-63537-28521');
    expect(contact.github).toContain('github.com/jaiminvadadoriya');
    expect(contact.linkedin).toContain('linkedin.com/in/jaiminvadadoriya');
    
    console.log('--- Extracted Text Preview ---');
    console.log(text.substring(0, 300));
  });
});
