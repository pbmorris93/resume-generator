import handlebars from 'handlebars';
import { PDFOptions } from '../generators/pdf-generator.js';
import { validateCompleteOfflineCompatibility } from '../utils/offline-validator.js';
import { templateCache } from '../utils/template-cache.js';

// Register Handlebars helpers
handlebars.registerHelper('formatDate', (dateString: string) => {
  if (!dateString) return 'Present';
  
  // Handle both simple YYYY-MM-DD format and ISO datetime strings
  let date: Date;
  if (dateString.includes('T')) {
    // ISO datetime format - just use Date constructor
    date = new Date(dateString);
  } else {
    // Simple YYYY-MM-DD format - parse manually to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    date = new Date(year, month - 1, day); // month - 1 because Date expects 0-indexed months
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
});

handlebars.registerHelper('formatYear', (dateString: string) => {
  if (!dateString) return '';
  
  // Handle both simple YYYY-MM-DD format and ISO datetime strings
  let date: Date;
  if (dateString.includes('T')) {
    date = new Date(dateString);
  } else {
    const [year] = dateString.split('-').map(Number);
    return year.toString();
  }
  
  if (isNaN(date.getTime())) {
    return '';
  }
  
  return date.getFullYear().toString();
});

handlebars.registerHelper('join', function(array: string[], separator: string | object = ', ') {
  // When called without explicit separator, Handlebars passes options object as second parameter
  const actualSeparator = typeof separator === 'string' ? separator : ', ';
  
  if (Array.isArray(array)) {
    return array.join(actualSeparator);
  }
  // Handle case where array might be undefined or not an array
  return '';
});

handlebars.registerHelper('contactIcon', (type: string, atsMode: boolean) => {
  if (atsMode) return '';
  const icons = {
    email: '📧',
    phone: '📞',
    location: '📍',
    url: '🌐'
  };
  return icons[type] || '';
});


// Default resume template
const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{basics.name}} - Resume</title>
  <style>
    @page {
      size: letter;
      margin: 0.5in;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.3;
      color: #000;
      margin: 0;
      padding: 0;
      max-width: 7.5in;
      background: white;
    }
    h1 { 
      font-size: 20pt; 
      font-weight: bold;
      margin: 0 0 8px 0; 
      text-align: center;
      color: #000;
    }
    h2 { 
      font-size: 12pt; 
      font-weight: bold;
      margin: 16px 0 8px 0; 
      {{#unless atsMode}}text-transform: uppercase;
      border-bottom: 1px solid #000; 
      padding-bottom: 2px;{{/unless}}
      color: #000;
    }
    h3 { 
      font-size: 11pt; 
      font-weight: bold;
      margin: 10px 0 3px 0; 
      color: #000;
    }
    p {
      margin: 3px 0;
    }
    .contact-info { 
      text-align: center;
      margin-bottom: 20px; 
      font-size: 10pt;
    }
    .contact-info span { 
      margin: 0 8px;
      color: #000;
    }
    .work-entry, .education-entry { 
      margin-bottom: 12px; 
    }
    .job-header {
      {{#unless atsMode}}display: flex;
      justify-content: space-between;
      align-items: baseline;{{/unless}}
      margin-bottom: 2px;
    }
    .job-title { 
      font-weight: bold; 
      font-size: 11pt;
    }
    .company { 
      font-weight: normal;
      font-style: italic; 
      font-size: 11pt;
      color: #5e5e5e;
    }
    .dates-location { 
      font-size: 10pt;
      color: #000;
      text-align: right;
    }
    .highlights { 
      margin: 5px 0 0 0; 
      padding-left: 16px;
    }
    .highlights li { 
      margin-bottom: 3px; 
      font-size: 10pt;
      line-height: 1.2;
    }
    .skills-section { 
      margin-top: 8px; 
    }
    .skill-category { 
      margin-bottom: 6px; 
      font-size: 10pt;
    }
    .skill-name { 
      font-weight: bold; 
      color: #000;
    }
    .keywords { 
      color: #000; 
      font-weight: normal;
    }
    .education-details {
      font-size: 10pt;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <header>
    <h1>{{basics.name}}</h1>
    {{#if basics.label}}<p style="text-align: center; margin: 5px 0 15px 0; font-size: 14pt; font-weight: bold; color: #000;">{{basics.label}}</p>{{/if}}
    <div class="contact-info">
      {{#if basics.location.city}}<span>{{basics.location.city}}{{#if basics.location.region}}, {{basics.location.region}}{{/if}}</span>{{/if}}
      {{#if basics.email}}<span><strong>Email:</strong> {{basics.email}}</span>{{/if}}
      {{#if basics.phone}}<span><strong>Phone:</strong> {{basics.phone}}</span>{{/if}}
      {{#if basics.url}}<span>{{basics.url}}</span>{{/if}}
    </div>
    {{#if basics.summary}}<p style="text-align: center; margin-bottom: 20px; font-style: italic;">{{basics.summary}}</p>{{/if}}
  </header>

  {{#if work}}
  <section>
    <h2>Work Experience</h2>
    {{#each work}}
    <div class="work-entry">
      <div class="job-header">
        <div>
          <div class="job-title">{{position}}</div>
          <div class="company">{{name}}</div>
        </div>
        <div class="dates-location">
          {{formatDate startDate}} - {{formatDate endDate}}{{#if location}}, {{location}}{{/if}}
        </div>
      </div>
      {{#if summary}}<p style="font-size: 10pt; margin: 3px 0;">{{summary}}</p>{{/if}}
      {{#if highlights}}
      <ul class="highlights">
        {{#each highlights}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
      {{/if}}
    </div>
    {{/each}}
  </section>
  {{/if}}

  {{#if education}}
  <section>
    <h2>Education</h2>
    {{#each education}}
    <div class="education-entry">
      <h3>{{studyType}}{{#if area}} - {{area}}{{/if}}</h3>
      <div class="education-details">{{institution}}{{#if location}} • {{location}}{{/if}}{{#if endDate}} • {{formatYear endDate}}{{/if}}</div>
      {{#if startDate}}<p style="font-size: 10pt;">{{formatDate startDate}} - {{formatDate endDate}}</p>{{/if}}
      {{#if gpa}}<p style="font-size: 10pt;">GPA: {{gpa}}</p>{{/if}}
    </div>
    {{/each}}
  </section>
  {{/if}}

  {{#if projects}}
  <section>
    <h2>Projects</h2>
    {{#each projects}}
    <div class="work-entry">
      <h3>{{name}}</h3>
      {{#if startDate}}<p class="dates">{{formatDate startDate}} - {{formatDate endDate}}</p>{{/if}}
      {{#if description}}<p style="margin: 8px 0;">{{description}}</p>{{/if}}
      {{#if highlights}}
      <ul class="highlights">
        {{#each highlights}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
      {{/if}}
    </div>
    {{/each}}
  </section>
  {{/if}}

  {{#if skills}}
  <section>
    <h2>Skills</h2>
    <div class="skills-section">
      {{#each skills}}
      <div class="skill-category">
        <span class="skill-name">{{name}}:</span> <span class="keywords">{{join keywords}}</span>
      </div>
      {{/each}}
    </div>
  </section>
  {{/if}}
</body>
</html>`;


export async function generateHTML(resumeData: unknown, options: PDFOptions = {}): Promise<string> {
  // Always use the single template but cache by template name for stats
  const templateSource = template;
  const templateName = options.template || 'ats-optimized';
  const cacheKey = templateName === 'professional' ? 'professional' : 'default';
  
  // Get compiled template from cache
  const compiledTemplate = templateCache.getTemplate(cacheKey, templateSource);
  
  // Pass options to template for conditional logic
  const templateData = {
    ...resumeData,
    atsMode: options.atsMode || false,
    templateName: options.template || 'ats-optimized'
  };
  
  const htmlContent = compiledTemplate(templateData);
  
  // Validate offline compatibility (only in development/debug mode)
  if (process.env.NODE_ENV !== 'production') {
    const validation = validateCompleteOfflineCompatibility(htmlContent);
    if (!validation.isOfflineCompatible) {
      console.warn('⚠️  Offline compatibility issues detected:');
      validation.issues.forEach(issue => console.warn(`  - ${issue}`));
    }
    
    if (validation.warnings.length > 0) {
      console.info('ℹ️  Offline compatibility warnings:');
      validation.warnings.forEach(warning => console.info(`  - ${warning}`));
    }
  }
  
  return htmlContent;
}