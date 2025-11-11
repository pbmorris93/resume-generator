/**
 * Offline validation utilities to ensure local-only operation
 */

export interface OfflineValidationResult {
  isOfflineCompatible: boolean;
  issues: string[];
  warnings: string[];
}

/**
 * Validates HTML content for offline compatibility
 */
export function validateHTMLOfflineCompatibility(htmlContent: string): OfflineValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check for problematic external references (not just text URLs)
  const externalUrlPatterns = [
    { pattern: /@import\s+url\s*\(/gi, message: 'CSS @import declarations found' },
    { pattern: /src\s*=\s*["']https?:/gi, message: 'External script/image sources found' },
    { pattern: /href\s*=\s*["']https?:/gi, message: 'External links found' },
    { pattern: /url\s*\(\s*["']?https?:/gi, message: 'External CSS background URLs found' },
    { pattern: /<script[^>]*src\s*=\s*["']?https?:/gi, message: 'External scripts found' },
    { pattern: /<link[^>]*href\s*=\s*["']?https?:/gi, message: 'External stylesheets found' },
  ];

  for (const { pattern, message } of externalUrlPatterns) {
    const matches = htmlContent.match(pattern);
    if (matches) {
      issues.push(`${message}: ${matches.slice(0, 3).join(', ')}${matches.length > 3 ? '...' : ''}`);
    }
  }

  // Check for external CDN references
  const cdnPatterns = [
    { pattern: /fonts\.googleapis\.com/gi, message: 'Google Fonts CDN reference' },
    { pattern: /fonts\.gstatic\.com/gi, message: 'Google Fonts static CDN reference' },
    { pattern: /cdnjs\.cloudflare\.com/gi, message: 'CDNJS reference' },
    { pattern: /unpkg\.com/gi, message: 'unpkg CDN reference' },
    { pattern: /jsdelivr\.net/gi, message: 'jsDelivr CDN reference' },
    { pattern: /fontawesome\.com/gi, message: 'Font Awesome CDN reference' },
  ];

  for (const { pattern, message } of cdnPatterns) {
    if (pattern.test(htmlContent)) {
      issues.push(message);
    }
  }

  // Check for analytics/telemetry
  const analyticsPatterns = [
    { pattern: /google-analytics/gi, message: 'Google Analytics tracking' },
    { pattern: /gtag\(/gi, message: 'Google Tag Manager tracking' },
    { pattern: /mixpanel/gi, message: 'Mixpanel analytics' },
    { pattern: /segment\.com/gi, message: 'Segment analytics' },
  ];

  for (const { pattern, message } of analyticsPatterns) {
    if (pattern.test(htmlContent)) {
      issues.push(message);
    }
  }

  // Warnings for potential issues
  if (htmlContent.includes('<script')) {
    warnings.push('JavaScript detected - ensure it doesn\'t make network calls');
  }

  if (!htmlContent.includes('<style>') && !htmlContent.includes('style=')) {
    warnings.push('No inline styles detected - ensure CSS is embedded');
  }

  return {
    isOfflineCompatible: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Validates that all fonts are system fonts or embedded
 */
export function validateFontsOfflineCompatibility(htmlContent: string): OfflineValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Extract font-family declarations
  const fontFamilyMatches = htmlContent.match(/font-family:\s*[^;}]+/gi);
  
  const systemFonts = [
    'arial', 'calibri', 'times new roman', 'georgia', 'helvetica',
    'verdana', 'tahoma', 'trebuchet ms', 'courier new', 'impact',
    'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'
  ];

  if (fontFamilyMatches) {
    for (const fontDeclaration of fontFamilyMatches) {
      const hasSystemFont = systemFonts.some(font => 
        fontDeclaration.toLowerCase().includes(font)
      );
      
      if (!hasSystemFont) {
        warnings.push(`Non-system font detected: ${fontDeclaration.trim()}`);
      }
    }
  }

  // Check for @font-face with external URLs
  const fontFaceMatches = htmlContent.match(/@font-face\s*{[^}]*}/gis);
  if (fontFaceMatches) {
    for (const fontFace of fontFaceMatches) {
      if (fontFace.match(/url\s*\(\s*["']?https?:/i)) {
        issues.push('External font URL in @font-face declaration');
      }
    }
  }

  return {
    isOfflineCompatible: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Validates that all assets are bundled/embedded
 */
export function validateAssetsOfflineCompatibility(htmlContent: string): OfflineValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check for external asset references
  const externalAssetPatterns = [
    { pattern: /src\s*=\s*["'](?!data:)[^"']*\.(png|jpg|jpeg|gif|svg|ico)/gi, message: 'External image reference' },
    { pattern: /url\s*\(\s*["']?(?!data:)[^"')]*\.(png|jpg|jpeg|gif|svg|ico)/gi, message: 'External background image' },
    { pattern: /<link[^>]*href\s*=\s*["'][^"']*\.(css|js)/gi, message: 'External stylesheet/script link' },
  ];

  for (const { pattern, message } of externalAssetPatterns) {
    const matches = htmlContent.match(pattern);
    if (matches) {
      issues.push(`${message}: ${matches.slice(0, 2).join(', ')}`);
    }
  }

  // Check that styles are inlined
  if (!htmlContent.includes('<style>')) {
    warnings.push('No inline styles found - ensure CSS is embedded');
  }

  // Check for data URLs (good for embedding)
  const dataUrlCount = (htmlContent.match(/data:/gi) || []).length;
  if (dataUrlCount > 0) {
    warnings.push(`Found ${dataUrlCount} data URLs (good for offline)`);
  }

  return {
    isOfflineCompatible: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Comprehensive offline compatibility validation
 */
export function validateCompleteOfflineCompatibility(htmlContent: string): OfflineValidationResult {
  const htmlValidation = validateHTMLOfflineCompatibility(htmlContent);
  const fontValidation = validateFontsOfflineCompatibility(htmlContent);
  const assetValidation = validateAssetsOfflineCompatibility(htmlContent);

  return {
    isOfflineCompatible: htmlValidation.isOfflineCompatible && 
                        fontValidation.isOfflineCompatible && 
                        assetValidation.isOfflineCompatible,
    issues: [
      ...htmlValidation.issues,
      ...fontValidation.issues,
      ...assetValidation.issues
    ],
    warnings: [
      ...htmlValidation.warnings,
      ...fontValidation.warnings,
      ...assetValidation.warnings
    ]
  };
}

/**
 * Network request monitor for runtime validation
 */
export class NetworkRequestMonitor {
  private networkRequests: string[] = [];
  private isMonitoring = false;

  start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.networkRequests = [];

    // Mock fetch to detect network calls
    const originalFetch = global.fetch;
    global.fetch = ((url: string, ...args: any[]) => {
      this.networkRequests.push(`FETCH: ${url}`);
      return originalFetch.call(global, url, ...args);
    }) as typeof fetch;

    // Mock HTTP modules
    const originalHttpsRequest = require('https').request;
    require('https').request = (...args: any[]) => {
      this.networkRequests.push(`HTTPS: ${JSON.stringify(args[0])}`);
      return originalHttpsRequest.apply(require('https'), args);
    };

    const originalHttpRequest = require('http').request;
    require('http').request = (...args: any[]) => {
      this.networkRequests.push(`HTTP: ${JSON.stringify(args[0])}`);
      return originalHttpRequest.apply(require('http'), args);
    };
  }

  stop(): string[] {
    this.isMonitoring = false;
    return [...this.networkRequests];
  }

  getNetworkRequests(): string[] {
    return [...this.networkRequests];
  }

  hasNetworkActivity(): boolean {
    return this.networkRequests.length > 0;
  }
}