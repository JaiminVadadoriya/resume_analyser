import { Injectable } from '@angular/core';
import { ContactInfo } from './resume-parser.service';

@Injectable({
  providedIn: 'root'
})
export class LatexGeneratorService {
  private readonly COMPETENCY_CATEGORIES: Record<string, string> = {
    'Software Development': 'Technical Skills',
    'Data Analysis & Research': 'Technical Skills',
    'System Architecture & Infrastructure': 'Technical Skills',
    'Leadership & Team Management': 'Core Competencies',
    'Sales & Business Development': 'Core Competencies',
    'Marketing & Brand Strategy': 'Core Competencies',
    'Operations & Project Management': 'Core Competencies',
    'Customer Support & Interaction': 'Core Competencies',
    'Problem Solving & Critical Thinking': 'Cognitive Skills',
    'Creative Design & Layout': 'Cognitive Skills',
    'Financial Planning & Accounting': 'Core Competencies',
    'Human Resources & Talent Acquisition': 'Core Competencies'
  };

  /**
   * Generates a complete LaTeX resume document based on the selected template type
   */
  generateLatex(templateType: string, contact: ContactInfo, matched: string[], missing: string[]): string {
    const name = contact.name || 'Your Name';
    const email = contact.email || 'your.email@example.com';
    const phone = contact.phone || '+1-555-555-5555';
    
    let linkedin = 'linkedin-username';
    if (contact.linkedin) {
      const parts = contact.linkedin.replace(/\/$/, '').split('/');
      linkedin = parts[parts.length - 1] || linkedin;
    }

    let github = 'github-username';
    if (contact.github) {
      const parts = contact.github.replace(/\/$/, '').split('/');
      github = parts[parts.length - 1] || github;
    }

    const typeNormalized = (templateType || 'technical').toLowerCase();

    switch (typeNormalized) {
      case 'business':
        return this.buildBusinessTemplate(name, email, phone, linkedin, github, matched, missing);
      case 'academic':
        return this.buildAcademicTemplate(name, email, phone, linkedin, github, matched, missing);
      case 'fresher':
        return this.buildFresherTemplate(name, email, phone, linkedin, github, matched, missing);
      case 'executive':
        return this.buildExecutiveTemplate(name, email, phone, linkedin, github, matched, missing);
      case 'creative':
        return this.buildCreativeTemplate(name, email, phone, linkedin, github, matched, missing);
      case 'technical':
      default:
        return this.buildTechnicalTemplate(name, email, phone, linkedin, github, matched, missing);
    }
  }

  /**
   * Helper to format skills categories list for LaTeX
   */
  private formatSkillsList(matched: string[], missing: string[]): string {
    const categories: Record<string, { matched: string[], missing: string[] }> = {
      'Technical Skills': { matched: [], missing: [] },
      'Core Competencies': { matched: [], missing: [] },
      'Cognitive Skills': { matched: [], missing: [] }
    };

    matched.forEach(skill => {
      const cat = this.COMPETENCY_CATEGORIES[skill] || 'Core Competencies';
      if (categories[cat]) categories[cat].matched.push(skill);
    });

    missing.forEach(skill => {
      const cat = this.COMPETENCY_CATEGORIES[skill] || 'Core Competencies';
      if (categories[cat]) categories[cat].missing.push(skill);
    });

    const lines: string[] = [];
    Object.keys(categories).forEach(cat => {
      const data = categories[cat];
      if (data.matched.length > 0 || data.missing.length > 0) {
        let line = `     \\textbf{${cat}:} `;
        if (data.matched.length > 0) {
          line += data.matched.join(', ');
        } else {
          line += 'None';
        }
        if (data.missing.length > 0) {
          line += ` \\% Missing: ${data.missing.join(', ')} (Develop & Add)`;
        }
        line += ` \\\\`;
        lines.push(line);
      }
    });

    if (lines.length > 0) {
      lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\\\$/, '');
    }

    return lines.join('\n');
  }

  // ==========================================
  // TEMPLATE BUILDERS
  // ==========================================

  private buildTechnicalTemplate(name: string, email: string, phone: string, linkedin: string, github: string, matched: string[], missing: string[]): string {
    const skillsList = this.formatSkillsList(matched, missing);
    const highlighted = matched.slice(0, 3).join(', ') || 'Software Development';

    return `%-------------------------
% Classical Technical Resume (ATS-Optimized)
%-------------------------
\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.0in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\pdfgentounicode=1
\\urlstyle{same}
\\raggedbottom
\\raggedright

\\titleformat{\\section}{\\vspace{-4pt}\\scshape\\raggedright\\large}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-2pt}}}}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\begin{document}

\\begin{center}
    \\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{1pt}
    \\small ${phone} $|$ \\href{mailto:${email}}{\\underline{${email}}} $|$ 
    \\href{https://linkedin.com/in/${linkedin}}{\\underline{linkedin.com/in/${linkedin}}} $|$
    \\href{https://github.com/${github}}{\\underline{github.com/${github}}}
\\end{center}

\\section{Education}
  \\begin{itemize}[leftmargin=0.15in, label={}]
    \\resumeSubheading
      {University Name}{City, State}
      {Bachelor of Science in Computer Science}{Graduation Month Year}
  \\end{itemize}

\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${skillsList}
    }}
 \\end{itemize}

\\section{Experience}
  \\begin{itemize}[leftmargin=0.15in, label={}]
    \\resumeSubheading
      {Company Name}{City, State}
      {Software Engineer}{Month Year -- Present}
      \\begin{itemize}
        \\resumeItem{Architected and deployed high-performance web systems using ${highlighted}.}
        \\resumeItem{Collaborated with developers to implement semantic analytics tools, boosting speed by 25\\%.}
        \\resumeItem{Identified system bottlenecks and optimized processes to scale traffic flow.}
      \\end{itemize}
  \\end{itemize}

\\section{Projects}
  \\begin{itemize}[leftmargin=0.15in, label={}]
    \\resumeSubheading
      {AI Resume Matcher}{}
      {Technologies Used: TypeScript, Angular, TensorFlow.js}{}
      \\begin{itemize}
        \\resumeItem{Created a client-side parsing app evaluating document alignment and semantic similarity.}
      \\end{itemize}
  \\end{itemize}

\\end{document}
`;
  }

  private buildBusinessTemplate(name: string, email: string, phone: string, linkedin: string, github: string, matched: string[], missing: string[]): string {
    const skillsList = this.formatSkillsList(matched, missing);
    const highlighted = matched.slice(0, 3).join(', ') || 'Leadership, Strategy';

    return `%-------------------------
% Professional Business & Management Resume
%-------------------------
\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\input{glyphtounicode}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.0in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\pdfgentounicode=1
\\urlstyle{same}
\\raggedbottom
\\raggedright

\\titleformat{\\section}{\\vspace{-2pt}\\bfseries\\uppercase\\large}{}{0em}{}[\\color{black}\\titlerule \\vspace{-3pt}]

\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-1pt}}}}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-1pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} -- \\textit{\\small#3} & \\textbf{#2} \\\\
    \\end{tabular*}\\vspace{-5pt}
}

\\begin{document}

\\begin{center}
    \\textbf{\\Huge ${name}} \\\\ \\vspace{4pt}
    \\small ${phone} $|$ \\href{mailto:${email}}{${email}} $|$ 
    \\href{https://linkedin.com/in/${linkedin}}{LinkedIn: ${linkedin}}
\\end{center}

\\section{Professional Summary}
\\small{Result-driven business professional with documented success leading operations, accelerating revenue development, and implementing strategic frameworks. Skilled in ${highlighted} and building cross-functional alignment.}

\\section{Core Competencies}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${skillsList}
    }}
 \\end{itemize}

\\section{Professional Experience}
  \\begin{itemize}[leftmargin=0.15in, label={}]
    \\resumeSubheading
      {Enterprise Solutions Corp}{London, UK}
      {Business Operations Manager}{2023 -- Present}
      \\begin{itemize}
        \\resumeItem{Directed strategic operations resulting in a 15\\% increase in productivity across 3 units.}
        \\resumeItem{Managed budget allocation and resource planning ($|$\\$500K portfolio), minimizing cost leaks by 8\\%.}
        \\resumeItem{Spearheaded business development projects capturing new market opportunities.}
      \\end{itemize}
  \\end{itemize}

\\section{Education}
  \\begin{itemize}[leftmargin=0.15in, label={}]
    \\item
      \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
        \\textbf{Business School Name} & MBA in Management, Year \\\\
      \\end{tabular*}
  \\end{itemize}

\\end{document}
`;
  }

  private buildAcademicTemplate(name: string, email: string, phone: string, linkedin: string, github: string, matched: string[], missing: string[]): string {
    const skillsList = this.formatSkillsList(matched, missing);
    return `%-------------------------
% Academic Curriculum Vitae (CV)
%-------------------------
\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\input{glyphtounicode}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.0in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\pdfgentounicode=1
\\urlstyle{same}
\\raggedbottom
\\raggedright

\\titleformat{\\section}{\\vspace{-5pt}\\bfseries\\large}{}{0em}{}[\\color{black}\\titlerule \\vspace{-3pt}]

\\begin{document}

\\begin{center}
    \\textbf{\\Huge ${name}} \\\\ \\vspace{2pt}
    \\small Department of Computer Science $|$ University Name \\\\
    \\small Phone: ${phone} $|$ Email: \\href{mailto:${email}}{${email}} $|$ GitHub: \\href{https://github.com/${github}}{${github}}
\\end{center}

\\section{Research Interests}
\\small{Artificial Intelligence, Semantic NLP, Data Science, Human-Computer Interaction.}

\\section{Education}
\\begin{itemize}[leftmargin=0.15in, label={}]
  \\item \\textbf{Ph.D. in Computer Science}, University Name, Year
  \\item \\textbf{M.S. in Computer Science}, University Name, Year
  \\item \\textbf{B.S. in Computer Science}, University Name, Year
\\end{itemize}

\\section{Methodological Competencies}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${skillsList}
    }}
 \\end{itemize}

\\section{Teaching Experience}
\\begin{itemize}[leftmargin=0.15in, label={}]
  \\item \\textbf{Graduate Teaching Assistant}, University Name, Year -- Present \\\\
  Co-lectured courses and graded assignments for 120+ undergraduate students.
\\end{itemize}

\\section{Selected Publications}
\\begin{enumerate}[leftmargin=0.2in]
  \\item ${name}, et al. "Semantic Embeddings for Universal Talent Competency Analysis." \\textit{Journal of Computational Intelligence}, Year.
\\end{enumerate}

\\end{document}
`;
  }

  private buildFresherTemplate(name: string, email: string, phone: string, linkedin: string, github: string, matched: string[], missing: string[]): string {
    const skillsList = this.formatSkillsList(matched, missing);
    const highlighted = matched.slice(0, 2).join(' and ') || 'Problem Solving';

    return `%-------------------------
% Entry-Level Student / Fresher Resume
%-------------------------
\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\input{glyphtounicode}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.0in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\pdfgentounicode=1
\\urlstyle{same}
\\raggedbottom
\\raggedright

\\titleformat{\\section}{\\vspace{-4pt}\\scshape\\raggedright\\large}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-2pt}}}}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\begin{document}

\\begin{center}
    \\textbf{\\Huge ${name}} \\\\ \\vspace{1pt}
    \\small Phone: ${phone} $|$ Email: \\href{mailto:${email}}{${email}} \\\\
    \\small LinkedIn: \\href{https://linkedin.com/in/${linkedin}}{${linkedin}} $|$ GitHub: \\href{https://github.com/${github}}{${github}}
\\end{center}

\\section{Education}
  \\begin{itemize}[leftmargin=0.15in, label={}]
    \\resumeSubheading
      {Your University}{City, State}
      {B.S. in Computer Science (GPA: 3.8/4.0)}{Expected Graduation Year}
  \\end{itemize}

\\section{Skills \\& Capabilities}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${skillsList}
    }}
 \\end{itemize}

\\section{Academic Projects}
  \\begin{itemize}[leftmargin=0.15in, label={}]
    \\resumeSubheading
      {Self-Service Analytics Engine}{}
      {Coursework Project}{}
      \\begin{itemize}
        \\resumeItem{Designed and implemented a data model with focus on ${highlighted}.}
        \\resumeItem{Configured custom test suites to verify reliability, maintaining 95\\% coverage.}
      \\end{itemize}
  \\end{itemize}

\\section{Extracurricular Activities}
\\begin{itemize}[leftmargin=0.15in]
  \\item Member of Student Programming Club, participating in weekly algorithms workshops.
\\end{itemize}

\\end{document}
`;
  }

  private buildExecutiveTemplate(name: string, email: string, phone: string, linkedin: string, github: string, matched: string[], missing: string[]): string {
    const skillsList = this.formatSkillsList(matched, missing);
    const highlighted = matched.slice(0, 3).join(', ') || 'Organizational Strategy, Executive Leadership';

    return `%-------------------------
% Executive Leadership Profile
%-------------------------
\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\input{glyphtounicode}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.0in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\pdfgentounicode=1
\\urlstyle{same}
\\raggedbottom
\\raggedright

\\titleformat{\\section}{\\vspace{-3pt}\\bfseries\\uppercase\\large}{}{0em}{}[\\color{black}\\titlerule \\vspace{-4pt}]

\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-1.5pt}}}}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-1pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-6pt}
}

\\begin{document}

\\begin{center}
    \\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{2pt}
    \\small ${phone} $|$ \\href{mailto:${email}}{${email}} $|$ \\href{https://linkedin.com/in/${linkedin}}{LinkedIn: ${linkedin}}
\\end{center}

\\section{Executive Summary}
\\small{Senior Executive with over a decade of experience steering organizational growth, managing large budgets, and leading digital transformation initiatives. Recognized for driving operational excellence and implementing ${highlighted}.}

\\section{Core Strengths \\& Expert Competencies}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${skillsList}
    }}
 \\end{itemize}

\\section{Selected Leadership Milestones}
  \\begin{itemize}[leftmargin=0.15in, label={}]
    \\resumeSubheading
      {Global Technology Group}{New York, NY}
      {Vice President of Engineering}{2021 -- Present}
      \\begin{itemize}
        \\resumeItem{Supervised a 45-person engineering department across 3 regional offices, managing a $|$\\$4M budget.}
        \\resumeItem{Re-architected enterprise operations to achieve a 30\\% boost in delivery velocity.}
        \\resumeItem{Partnered with executive leadership to define the product roadmap, increasing annual ROI by 12\\%.}
      \\end{itemize}
  \\end{itemize}

\\section{Board Memberships \\& Education}
\\begin{itemize}[leftmargin=0.15in, label={}]
  \\item \\textbf{M.S. in Management \\& Technology}, Prestigious Institute, Year
\\end{itemize}

\\end{document}
`;
  }

  private buildCreativeTemplate(name: string, email: string, phone: string, linkedin: string, github: string, matched: string[], missing: string[]): string {
    const skillsList = this.formatSkillsList(matched, missing);
    const highlighted = matched.slice(0, 3).join(', ') || 'UX Design, Creative Strategy';

    return `%-------------------------
% Modern Creative / Design Resume
%-------------------------
\\documentclass[letterpaper,10pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\input{glyphtounicode}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.0in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\pdfgentounicode=1
\\urlstyle{same}
\\raggedbottom
\\raggedright

\\definecolor{PrimaryColor}{RGB}{124, 58, 237} % Deep purple
\\titleformat{\\section}{\\vspace{-4pt}\\bfseries\\color{PrimaryColor}\\large}{}{0em}{}[\\color{PrimaryColor}\\titlerule \\vspace{-5pt}]

\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-2pt}}}}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{\\color{black}#1} & \\color{gray}#2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\begin{document}

\\begin{center}
    {\\Huge \\bfseries \\color{PrimaryColor} ${name}} \\\\ \\vspace{2pt}
    \\small ${phone} $\\bullet$ \\href{mailto:${email}}{${email}} $\\bullet$ \\href{https://linkedin.com/in/${linkedin}}{linkedin.com/in/${linkedin}}
\\end{center}

\\section{Profile}
\\small{Forward-thinking creative professional specializing in user experience, visual communications, and brand strategy. Passionate about blending ${highlighted} with user-centric outcomes.}

\\section{Creative Skillset}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${skillsList}
    }}
 \\end{itemize}

\\section{Selected Achievements}
  \\begin{itemize}[leftmargin=0.15in, label={}]
    \\resumeSubheading
      {Pixel Perfect Studio}{San Francisco, CA}
      {Lead Experience Designer}{2022 -- Present}
      \\begin{itemize}
        \\resumeItem{Designed layout blueprints and UI architectures for client-facing mobile web apps.}
        \\resumeItem{Facilitated customer interaction workshops to extract brand voice and requirements.}
        \\resumeItem{Re-conceptualized interface design patterns to grow user retention metrics by 20\\%.}
      \\end{itemize}
  \\end{itemize}

\\section{Education}
  \\begin{itemize}[leftmargin=0.15in, label={}]
    \\resumeSubheading
      {Academy of Art University}{San Francisco, CA}
      {B.F.A. in Graphic Design}{Year}
  \\end{itemize}

\\end{document}
`;
  }
}
