/**
 * Generates a structured plain text resume from JSON data
 */
export async function generatePlainText(resumeData: any): Promise<string> {
  const lines: string[] = [];
  
  // Header section
  if (resumeData.basics) {
    const { name, label, email, phone, url, location, summary, profiles } = resumeData.basics;
    
    // Name and title
    if (name) {
      lines.push(name);
      lines.push('='.repeat(name.length));
    }
    
    if (label) {
      lines.push(label);
    }
    
    lines.push('');
    
    // Contact information
    lines.push('CONTACT INFORMATION');
    lines.push('-'.repeat(19));
    
    if (email) lines.push(`Email: ${email}`);
    if (phone) lines.push(`Phone: ${phone}`);
    if (url) lines.push(`Website: ${url}`);
    
    if (location) {
      const locationParts = [];
      if (location.city) locationParts.push(location.city);
      if (location.region) locationParts.push(location.region);
      if (locationParts.length > 0) {
        lines.push(`Location: ${locationParts.join(', ')}`);
      }
    }
    
    // Social profiles
    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        if (profile.network && profile.url) {
          lines.push(`${profile.network}: ${profile.url}`);
        }
      }
    }
    
    lines.push('');
    
    // Summary
    if (summary) {
      lines.push('SUMMARY');
      lines.push('-'.repeat(7));
      lines.push(summary);
      lines.push('');
    }
  }
  
  // Work Experience
  if (resumeData.work && resumeData.work.length > 0) {
    lines.push('WORK EXPERIENCE');
    lines.push('='.repeat(15));
    lines.push('');
    
    for (const job of resumeData.work) {
      // Job title and company
      if (job.position) {
        lines.push(job.position);
      }
      
      if (job.name) {
        lines.push(`${job.name}${job.location ? ` - ${job.location}` : ''}`);
      }
      
      // Dates
      if (job.startDate || job.endDate) {
        const startDate = job.startDate ? formatDate(job.startDate) : '';
        const endDate = job.endDate ? formatDate(job.endDate) : 'Present';
        lines.push(`${startDate} - ${endDate}`);
      }
      
      lines.push('');
      
      // Summary
      if (job.summary) {
        lines.push(job.summary);
        lines.push('');
      }
      
      // Highlights
      if (job.highlights && job.highlights.length > 0) {
        for (const highlight of job.highlights) {
          lines.push(`• ${highlight}`);
        }
        lines.push('');
      }
      
      lines.push('-'.repeat(40));
      lines.push('');
    }
  }
  
  // Education
  if (resumeData.education && resumeData.education.length > 0) {
    lines.push('EDUCATION');
    lines.push('='.repeat(9));
    lines.push('');
    
    for (const edu of resumeData.education) {
      // Degree and institution
      if (edu.studyType && edu.area) {
        lines.push(`${edu.studyType} in ${edu.area}`);
      } else if (edu.area) {
        lines.push(edu.area);
      }
      
      if (edu.institution) {
        lines.push(edu.institution);
      }
      
      // Dates
      if (edu.startDate || edu.endDate) {
        const startDate = edu.startDate ? formatDate(edu.startDate) : '';
        const endDate = edu.endDate ? formatDate(edu.endDate) : 'Present';
        lines.push(`${startDate} - ${endDate}`);
      }
      
      // GPA
      if (edu.gpa) {
        lines.push(`GPA: ${edu.gpa}`);
      }
      
      // Courses
      if (edu.courses && edu.courses.length > 0) {
        lines.push('Relevant Courses:');
        for (const course of edu.courses) {
          lines.push(`• ${course}`);
        }
      }
      
      lines.push('');
      lines.push('-'.repeat(40));
      lines.push('');
    }
  }
  
  // Skills
  if (resumeData.skills && resumeData.skills.length > 0) {
    lines.push('SKILLS');
    lines.push('='.repeat(6));
    lines.push('');
    
    for (const skillGroup of resumeData.skills) {
      if (skillGroup.name) {
        lines.push(skillGroup.name + ':');
      }
      
      if (skillGroup.keywords && skillGroup.keywords.length > 0) {
        const skillsList = skillGroup.keywords.join(', ');
        lines.push(`  ${skillsList}`);
      }
      
      if (skillGroup.level) {
        lines.push(`  Level: ${skillGroup.level}`);
      }
      
      lines.push('');
    }
  }
  
  // Projects
  if (resumeData.projects && resumeData.projects.length > 0) {
    lines.push('PROJECTS');
    lines.push('='.repeat(8));
    lines.push('');
    
    for (const project of resumeData.projects) {
      if (project.name) {
        lines.push(project.name);
      }
      
      if (project.url) {
        lines.push(project.url);
      }
      
      if (project.startDate || project.endDate) {
        const startDate = project.startDate ? formatDate(project.startDate) : '';
        const endDate = project.endDate ? formatDate(project.endDate) : 'Present';
        lines.push(`${startDate} - ${endDate}`);
      }
      
      if (project.description) {
        lines.push(project.description);
      }
      
      if (project.highlights && project.highlights.length > 0) {
        for (const highlight of project.highlights) {
          lines.push(`• ${highlight}`);
        }
      }
      
      if (project.keywords && project.keywords.length > 0) {
        lines.push(`Technologies: ${project.keywords.join(', ')}`);
      }
      
      lines.push('');
      lines.push('-'.repeat(40));
      lines.push('');
    }
  }
  
  // Awards
  if (resumeData.awards && resumeData.awards.length > 0) {
    lines.push('AWARDS');
    lines.push('='.repeat(6));
    lines.push('');
    
    for (const award of resumeData.awards) {
      if (award.title) {
        lines.push(award.title);
      }
      
      if (award.awarder) {
        lines.push(`Awarded by: ${award.awarder}`);
      }
      
      if (award.date) {
        lines.push(`Date: ${formatDate(award.date)}`);
      }
      
      if (award.summary) {
        lines.push(award.summary);
      }
      
      lines.push('');
    }
  }
  
  // Certifications
  if (resumeData.certifications && resumeData.certifications.length > 0) {
    lines.push('CERTIFICATIONS');
    lines.push('='.repeat(14));
    lines.push('');
    
    for (const cert of resumeData.certifications) {
      if (cert.name) {
        lines.push(cert.name);
      }
      
      if (cert.issuer) {
        lines.push(`Issuer: ${cert.issuer}`);
      }
      
      if (cert.date) {
        lines.push(`Date: ${formatDate(cert.date)}`);
      }
      
      if (cert.url) {
        lines.push(`URL: ${cert.url}`);
      }
      
      lines.push('');
    }
  }
  
  // Languages
  if (resumeData.languages && resumeData.languages.length > 0) {
    lines.push('LANGUAGES');
    lines.push('='.repeat(9));
    lines.push('');
    
    for (const lang of resumeData.languages) {
      const langLine = [];
      if (lang.language) langLine.push(lang.language);
      if (lang.fluency) langLine.push(`(${lang.fluency})`);
      
      if (langLine.length > 0) {
        lines.push(langLine.join(' '));
      }
    }
    
    lines.push('');
  }
  
  // Interests
  if (resumeData.interests && resumeData.interests.length > 0) {
    lines.push('INTERESTS');
    lines.push('='.repeat(9));
    lines.push('');
    
    for (const interest of resumeData.interests) {
      if (interest.name) {
        lines.push(interest.name);
        
        if (interest.keywords && interest.keywords.length > 0) {
          lines.push(`  ${interest.keywords.join(', ')}`);
        }
        
        lines.push('');
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Formats a date string for display in plain text
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  } catch {
    return dateString; // Return original if parsing fails
  }
}