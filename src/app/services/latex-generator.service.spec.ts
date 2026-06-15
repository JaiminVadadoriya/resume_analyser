import { describe, beforeEach, it, expect } from 'vitest';
import { LatexGeneratorService } from './latex-generator.service';
import { ContactInfo } from './resume-parser.service';

describe('LatexGeneratorService', () => {
  let service: LatexGeneratorService;
  
  const mockContact: ContactInfo = {
    name: 'Jaimin Vadadoriya',
    email: 'vadadoriyajaimin@gmail.com',
    phone: '+91-63537-28521',
    linkedin: 'https://linkedin.com/in/jaiminvadadoriya',
    github: 'https://github.com/jaiminvadadoriya'
  };

  const matchedCompetencies = ['Software Development', 'Leadership & Team Management'];
  const missingCompetencies = ['Sales & Business Development', 'Creative Design & Layout'];

  beforeEach(() => {
    service = new LatexGeneratorService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should compile classical technical LaTeX template and inject fields', () => {
    const latex = service.generateLatex('technical', mockContact, matchedCompetencies, missingCompetencies);
    
    expect(latex).toContain('Classical Technical Resume');
    expect(latex).toContain('Jaimin Vadadoriya');
    expect(latex).toContain('vadadoriyajaimin@gmail.com');
    expect(latex).toContain('+91-63537-28521');
    expect(latex).toContain('Software Development');
    expect(latex).toContain('% Missing: Sales & Business Development');
  });

  it('should compile business template and format summary section', () => {
    const latex = service.generateLatex('business', mockContact, matchedCompetencies, missingCompetencies);
    
    expect(latex).toContain('Professional Business & Management Resume');
    expect(latex).toContain('MBA in Management');
    expect(latex).toContain('Business Operations Manager');
  });

  it('should compile academic template and format selected publications', () => {
    const latex = service.generateLatex('academic', mockContact, matchedCompetencies, missingCompetencies);
    
    expect(latex).toContain('Academic Curriculum Vitae');
    expect(latex).toContain('Selected Publications');
    expect(latex).toContain('Semantic Embeddings for Universal Talent Competency Analysis');
  });

  it('should compile entry-level fresher template', () => {
    const latex = service.generateLatex('fresher', mockContact, matchedCompetencies, missingCompetencies);
    
    expect(latex).toContain('Entry-Level Student / Fresher Resume');
    expect(latex).toContain('Your University');
    expect(latex).toContain('Academic Projects');
  });

  it('should compile executive leadership profile', () => {
    const latex = service.generateLatex('executive', mockContact, matchedCompetencies, missingCompetencies);
    
    expect(latex).toContain('Executive Leadership Profile');
    expect(latex).toContain('Selected Leadership Milestones');
    expect(latex).toContain('Vice President of Engineering');
  });

  it('should compile creative layout with custom colors', () => {
    const latex = service.generateLatex('creative', mockContact, matchedCompetencies, missingCompetencies);
    
    expect(latex).toContain('Modern Creative / Design Resume');
    expect(latex).toContain('PrimaryColor');
    expect(latex).toContain('Pixel Perfect Studio');
  });
});
