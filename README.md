# Resume Generator

> 📄 Generate ATS-compliant PDF resumes from JSON data with professional templates

A powerful command-line tool that transforms your structured resume data into beautiful, ATS-friendly PDF documents. Built with Bun and TypeScript, designed for developers who want to maintain their resume as code.

[![CI](https://github.com/your-repo/resume-generator/workflows/CI/badge.svg)](https://github.com/your-repo/resume-generator/actions)
[![Bun version](https://img.shields.io/badge/bun-v1.0.0+-blue.svg)](https://bun.sh)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ Features

- **📝 JSON-based resume data** - Maintain your resume as structured data following the JSONResume standard
- **🎨 Professional templates** - Choose from multiple ATS-optimized templates
- **⚡ Fast generation** - Uses Playwright for high-quality PDF rendering
- **🔍 Schema validation** - Built-in validation ensures your data is complete and correct
- **👀 Live reload** - Watch mode automatically regenerates PDF when you edit your JSON
- **🔧 Highly configurable** - Customize output paths, templates, and generation options
- **🌐 Cross-platform** - Works on Windows, macOS, and Linux
- **📱 ATS-friendly** - Generated PDFs are optimized for Applicant Tracking Systems

## 🚀 Local Development Setup

### Prerequisites

- **Bun**: Version 1.0.0 or higher ([Install Bun](https://bun.sh))
- **Git**: For cloning the repository

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/your-repo/resume-generator.git
cd resume-generator
```

2. **Install dependencies**:
```bash
bun install
```

3. **Build the application**:
```bash
bun run build
```

4. **Verify the CLI works**:
```bash
./dist/index.js --version
./dist/index.js --help
```

### Development Workflow

1. **Start development mode** (auto-rebuilds on changes):
```bash
bun run dev
```

2. **Run tests**:
```bash
bun test
```

3. **Run linting**:
```bash
bun run lint
```

4. **Format code**:
```bash
bun run format
```

5. **Test with sample data**:
```bash
# Generate a sample resume
./dist/index.js --file examples/sample-resume.json --output test-resume.pdf

# Validate sample data
./dist/index.js validate examples/sample-resume.json
```

## 📋 Usage

### Command Syntax

```bash
resume-gen [options] [input-file]
resume-gen [command] [options] [input-file]
```

### Basic Examples

```bash
# Generate PDF using default template
resume-gen --file resume.json

# Use positional argument
resume-gen resume.json

# Specify output file
resume-gen --file resume.json --output my-resume.pdf

# Use ATS-optimized mode
resume-gen --file resume.json --ats-mode

# Watch for changes and auto-regenerate
resume-gen --file resume.json --watch

# Add timestamp to filename
resume-gen --file resume.json --timestamp
```

### Advanced Examples

```bash
# Use specific template
resume-gen --file resume.json --template modern

# Generate with custom output directory
resume-gen --file resume.json --output ./pdfs/resume-v2.pdf

# Force overwrite existing files
resume-gen --file resume.json --force

# Debug mode with verbose output
resume-gen --file resume.json --debug

# Explicit command usage
resume-gen generate resume.json --output output/
resume-gen validate resume.json
```

### Available Commands

| Command | Description |
|---------|-------------|
| `generate` | Generate PDF from JSON resume (default action) |
| `validate` | Validate JSON resume schema |
| `help` | Display help information |

### Options Reference

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--file <path>` | `-f` | JSON resume file path | - |
| `--output <path>` | `-o` | Output PDF file path | Auto-generated |
| `--template <name>` | `-t` | Template name | `ats-optimized` |
| `--ats-mode` | - | Enable ATS-optimized mode | `false` |
| `--timestamp` | - | Add timestamp to filename | `false` |
| `--force` | - | Overwrite existing files | `false` |
| `--watch` | `-w` | Watch for file changes | `false` |
| `--debug` | - | Enable debug mode | `false` |
| `--verbose` | - | Enable verbose output | `false` |
| `--version` | `-V` | Output version number | - |
| `--help` | `-h` | Display help | - |

## 📝 Resume Format

This tool follows the [JSONResume](https://jsonresume.org/) standard with some enhancements. Here's the basic structure:

### Required Fields

```json
{
  "basics": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "work": [
    {
      "name": "Company Name",
      "position": "Job Title",
      "startDate": "2020-01-01"
    }
  ]
}
```

### Complete Example

```json
{
  "basics": {
    "name": "John Doe",
    "label": "Software Engineer",
    "email": "john.doe@email.com",
    "phone": "+1-555-0123",
    "url": "https://johndoe.dev",
    "summary": "Experienced software engineer...",
    "location": {
      "city": "San Francisco",
      "region": "CA",
      "countryCode": "US"
    },
    "profiles": [
      {
        "network": "LinkedIn",
        "username": "johndoe",
        "url": "https://linkedin.com/in/johndoe"
      }
    ]
  },
  "work": [
    {
      "name": "Tech Corp",
      "position": "Senior Software Engineer",
      "url": "https://techcorp.com",
      "startDate": "2021-03-01",
      "summary": "Lead development of microservices...",
      "highlights": [
        "Designed scalable microservices architecture",
        "Led cross-functional team of 5 engineers"
      ],
      "location": "San Francisco, CA"
    }
  ],
  "education": [
    {
      "institution": "State University",
      "area": "Computer Science",
      "studyType": "Bachelor of Science",
      "startDate": "2015-09-01",
      "endDate": "2019-05-15"
    }
  ],
  "skills": [
    {
      "name": "Programming Languages",
      "level": "Advanced",
      "keywords": ["JavaScript", "TypeScript", "Python"]
    }
  ]
}
```

### Optional Sections

- `education` - Educational background
- `skills` - Technical and soft skills
- `projects` - Personal or professional projects
- `awards` - Recognition and achievements
- `certifications` - Professional certifications
- `publications` - Published works
- `languages` - Language proficiencies
- `interests` - Personal interests
- `references` - Professional references

See [examples/sample-resume.json](examples/sample-resume.json) for a complete working example.

## 🎨 Templates

### Available Templates

- **`ats-optimized`** (default) - Clean, ATS-friendly design
- **`modern`** - Contemporary styling with subtle colors
- **`classic`** - Traditional professional format

### Template Selection

```bash
# Use specific template
resume-gen --file resume.json --template modern

# ATS-optimized mode (overrides template selection)
resume-gen --file resume.json --ats-mode
```

## ⚡ Performance Tips

### Faster Generation

- Use `--watch` mode during development to avoid repeated startup costs
- Keep images optimized and reasonably sized
- Use the browser pool for batch processing multiple resumes

### Memory Optimization

The tool automatically manages browser instances for optimal performance:

```bash
# Watch mode reuses browser instances
resume-gen --file resume.json --watch
```

## 🔧 Troubleshooting

### Common Issues

#### "Command not found: resume-gen"

**Solution:**
```bash
# Check if npm global bin is in your PATH
npm config get prefix

# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export PATH="$(npm config get prefix)/bin:$PATH"

# Or reinstall globally
npm install -g resume-pdf-generator
```

#### "Permission denied" on Linux/macOS

**Solution:**
```bash
# Use sudo for global installation
sudo npm install -g resume-pdf-generator

# Or use a Node version manager (recommended)
# Install nvm: https://github.com/nvm-sh/nvm
nvm install node
npm install -g resume-pdf-generator
```

#### "Cannot find module" errors

**Solution:**
```bash
# Clear npm cache and reinstall
npm cache clean --force
npm install -g resume-pdf-generator

# Or try using npx instead
npx resume-pdf-generator --file resume.json
```

#### PDF generation fails

**Solution:**
```bash
# Run with debug mode to see detailed error
resume-gen --file resume.json --debug

# Check if your JSON is valid
resume-gen validate resume.json

# Ensure all required fields are present
node -p "JSON.parse(require('fs').readFileSync('resume.json', 'utf8'))"
```

#### Watch mode not working

**Solution:**
```bash
# Check file permissions
ls -la resume.json

# Use absolute path
resume-gen --file /full/path/to/resume.json --watch

# Try polling mode (if available)
CHOKIDAR_USEPOLLING=true resume-gen --file resume.json --watch
```

### Debug Mode

Enable verbose logging to diagnose issues:

```bash
resume-gen --file resume.json --debug
```

### System-Specific Issues

#### Windows PowerShell Execution Policy

```powershell
# If you get execution policy errors
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### macOS Gatekeeper

```bash
# If you get security warnings
xattr -d com.apple.quarantine /usr/local/bin/resume-gen
```

### Getting Help

If you encounter issues:

1. **Check the troubleshooting section above**
2. **Run with `--debug` flag** to get detailed error information
3. **Validate your JSON** using `resume-gen validate resume.json`
4. **Check our [examples](examples/)** for reference
5. **Open an issue** on GitHub with:
   - Your operating system and Node.js version
   - The exact command you ran
   - The complete error message
   - Your resume JSON (with personal info removed)

## 📚 Examples

### Development Workflow

```bash
# 1. Create your resume JSON
cp examples/sample-resume.json my-resume.json

# 2. Edit your resume data
vim my-resume.json  # or your preferred editor

# 3. Validate the structure
resume-gen validate my-resume.json

# 4. Generate PDF with live reload
resume-gen --file my-resume.json --watch

# 5. Generate final versions
resume-gen --file my-resume.json --output resume-standard.pdf
resume-gen --file my-resume.json --ats-mode --output resume-ats.pdf
```

### Batch Processing

```bash
# Generate multiple formats
resume-gen --file resume.json --output resume-v1.pdf
resume-gen --file resume.json --template modern --output resume-modern.pdf
resume-gen --file resume.json --ats-mode --output resume-ats.pdf
```

### CI/CD Integration

```yaml
# GitHub Actions example
name: Generate Resume
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g resume-pdf-generator
      - run: resume-gen --file resume.json --output resume.pdf
      - uses: actions/upload-artifact@v3
        with:
          name: resume
          path: resume.pdf
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-repo/resume-generator.git
cd resume-generator

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development mode
npm run dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- 📚 [JSONResume Standard](https://jsonresume.org/)
- 🎨 [Template Gallery](https://github.com/your-repo/resume-generator/wiki/templates)
- 📖 [Documentation](https://github.com/your-repo/resume-generator/wiki)
- 🐛 [Issue Tracker](https://github.com/your-repo/resume-generator/issues)
- 💬 [Discussions](https://github.com/your-repo/resume-generator/discussions)

---

**Made with ❤️ for developers who code their resumes**

*Star ⭐ this repo if you found it helpful!*