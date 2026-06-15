import { Injectable } from '@angular/core';
import { ContactInfo } from './resume-parser.service';

@Injectable({
  providedIn: 'root'
})
export class LatexGeneratorService {
  private readonly SKILL_CATEGORIES: Record<string, string> = {
    // Languages
    'JavaScript': 'Languages', 'TypeScript': 'Languages', 'Python': 'Languages', 'Java': 'Languages',
    'Go': 'Languages', 'C#': 'Languages', 'Ruby': 'Languages', 'PHP': 'Languages', 'SQL': 'Languages',
    
    // Frameworks & Libraries
    'Angular': 'Frameworks & Libraries', 'React': 'Frameworks & Libraries', 'Vue': 'Frameworks & Libraries',
    'Next.js': 'Frameworks & Libraries', 'Nuxt': 'Frameworks & Libraries', 'Svelte': 'Frameworks & Libraries',
    'Node.js': 'Frameworks & Libraries', 'Express': 'Frameworks & Libraries', 'NestJS': 'Frameworks & Libraries',
    'Spring Boot': 'Frameworks & Libraries', 'Django': 'Frameworks & Libraries', 'Flask': 'Frameworks & Libraries',
    'FastAPI': 'Frameworks & Libraries', 'Ruby on Rails': 'Frameworks & Libraries', 'Laravel': 'Frameworks & Libraries',
    'RxJS': 'Frameworks & Libraries', 'Redux': 'Frameworks & Libraries', 'Tailwind': 'Frameworks & Libraries',
    'Bootstrap': 'Frameworks & Libraries', 'Sass': 'Frameworks & Libraries',
    
    // Databases & Cloud
    'PostgreSQL': 'Databases & Cloud', 'MySQL': 'Databases & Cloud', 'MongoDB': 'Databases & Cloud',
    'Redis': 'Databases & Cloud', 'Firebase': 'Databases & Cloud', 'DynamoDB': 'Databases & Cloud',
    'SQLite': 'Databases & Cloud', 'Oracle': 'Databases & Cloud', 'Cassandra': 'Databases & Cloud',
    'AWS': 'Databases & Cloud', 'Azure': 'Databases & Cloud', 'GCP': 'Databases & Cloud',
    'Docker': 'Databases & Cloud', 'Kubernetes': 'Databases & Cloud', 'Terraform': 'Databases & Cloud',
    'Vercel': 'Databases & Cloud', 'Netlify': 'Databases & Cloud', 'Linux': 'Databases & Cloud',
    
    // Tools & Methodologies
    'Git': 'Tools & Methodologies', 'Webpack': 'Tools & Methodologies', 'Vite': 'Tools & Methodologies',
    'CI/CD': 'Tools & Methodologies', 'Unit Testing': 'Tools & Methodologies', 'Cypress': 'Tools & Methodologies',
    'Agile': 'Tools & Methodologies', 'REST API': 'Tools & Methodologies', 'GraphQL': 'Tools & Methodologies',
    'Microservices': 'Tools & Methodologies', 'System Design': 'Tools & Methodologies',
    'TensorFlow': 'Tools & Methodologies', 'PyTorch': 'Tools & Methodologies', 'Machine Learning': 'Tools & Methodologies',
    'Deep Learning': 'Tools & Methodologies', 'NLP': 'Tools & Methodologies', 'LLM': 'Tools & Methodologies',
    'Data Science': 'Tools & Methodologies', 'Pandas': 'Tools & Methodologies', 'NumPy': 'Tools & Methodologies',
    'Scikit-learn': 'Tools & Methodologies', 'OpenAI': 'Tools & Methodologies'
  };

  /**
   * Generates a complete LaTeX resume document incorporating matched and missing skills
   */
  generateLatex(contact: ContactInfo, matched: string[], missing: string[]): string {
    const skillsList = this.buildSkillsSection(matched, missing);
    const matchedSkillsStr = matched.slice(0, 4).join(', ') || 'Angular, TypeScript, JavaScript';

    const name = contact.name || 'Your Name';
    const email = contact.email || 'your.email@example.com';
    const phone = contact.phone || '+1-555-555-5555';
    
    // Extract LinkedIn username or default
    let linkedin = 'linkedin-username';
    if (contact.linkedin) {
      const parts = contact.linkedin.replace(/\/$/, '').split('/');
      linkedin = parts[parts.length - 1] || linkedin;
    }

    // Extract GitHub username or default
    let github = 'github-username';
    if (contact.github) {
      const parts = contact.github.replace(/\/$/, '').split('/');
      github = parts[parts.length - 1] || github;
    }

    return `%-------------------------
% Resume Template in LaTeX (ATS-Friendly & Tailored)
%-------------------------

\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{} % clear all header and footer fields
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.0in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% Ensure that generate pdf is machine readable/ATS-parseable
\\pdfgentounicode=1

%-------------------------
% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%############


\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{1pt}
    \\small ${phone} $|$ \\href{mailto:${email}}{\\underline{${email}}} $|$ 
    \\href{https://linkedin.com/in/${linkedin}}{\\underline{linkedin.com/in/${linkedin}}} $|$
    \\href{https://github.com/${github}}{\\underline{github.com/${github}}}
\\end{center}


%-----------EDUCATION-----------
\\section{Education}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {University Name}{City, State}
      {Bachelor of Science in Computer Science}{Graduation Month Year}
  \\resumeSubHeadingListEnd


%-----------TECHNICAL SKILLS-----------
\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${skillsList}
    }}
 \\end{itemize}


%-----------EXPERIENCE-----------
\\section{Experience}
  \\resumeSubHeadingListStart

    \\resumeSubheading
      {Company Name}{City, State}
      {Software Engineer}{Month Year -- Present}
      \\resumeItemListStart
        \\resumeItem{Developed robust and responsive web applications using ${matchedSkillsStr}.}
        \\resumeItem{Collaborated with cross-functional teams to integrate core product features, improving system alignment.}
        \\resumeItem{Optimized client-side workflows, resulting in a 25\\% improvement in performance and user retention.}
      \\resumeItemListEnd
      
  \\resumeSubHeadingListEnd


%-----------PROJECTS-----------
\\section{Projects}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {Project Title}{}
      {Technologies Used: ${matchedSkillsStr}}{}
      \\resumeItemListStart
        \\resumeItem{Designed and implemented a scalable, local-first web application solving core analytical needs.}
        \\resumeItem{Utilized vector processing and in-browser inference engines to secure personal candidate data.}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

\\end{document}
`;
  }

  /**
   * Groups matched and missing skills into formatted LaTeX bullet points
   */
  private buildSkillsSection(matched: string[], missing: string[]): string {
    const categories: Record<string, { matched: string[], missing: string[] }> = {
      'Languages': { matched: [], missing: [] },
      'Frameworks & Libraries': { matched: [], missing: [] },
      'Databases & Cloud': { matched: [], missing: [] },
      'Tools & Methodologies': { matched: [], missing: [] }
    };

    // Helper to group
    const groupSkill = (skill: string, isMatched: boolean) => {
      const category = this.SKILL_CATEGORIES[skill] || 'Tools & Methodologies';
      if (categories[category]) {
        if (isMatched) {
          categories[category].matched.push(skill);
        } else {
          categories[category].missing.push(skill);
        }
      }
    };

    matched.forEach(s => groupSkill(s, true));
    missing.forEach(s => groupSkill(s, false));

    const lines: string[] = [];
    Object.keys(categories).forEach(cat => {
      const catData = categories[cat];
      if (catData.matched.length > 0 || catData.missing.length > 0) {
        let line = `     \\textbf{${cat}:} `;
        
        // Add matched skills
        if (catData.matched.length > 0) {
          line += catData.matched.join(', ');
        } else {
          line += 'None (Add experience)';
        }

        // Add missing skills as comments
        if (catData.missing.length > 0) {
          const missingJoined = catData.missing.join(', ');
          line += ` \\% Missing: ${missingJoined} (Incorporate if you have experience)`;
        }

        line += ` \\\\`;
        lines.push(line);
      }
    });

    // Remove the trailing backslashes from the last line
    if (lines.length > 0) {
      lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\\\$/, '');
    }

    return lines.join('\n');
  }
}
