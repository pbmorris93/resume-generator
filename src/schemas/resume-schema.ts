// JSON Schema for resume validation
export const resumeSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["basics", "work"],
  "properties": {
    "basics": {
      "type": "object",
      "required": ["name", "email"],
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "label": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "phone": { "type": "string" },
        "url": { "type": "string", "format": "uri" },
        "summary": { "type": "string" },
        "location": {
          "type": "object",
          "properties": {
            "address": { "type": "string" },
            "postalCode": { "type": "string" },
            "city": { "type": "string" },
            "countryCode": { "type": "string" },
            "region": { "type": "string" }
          }
        },
        "profiles": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "network": { "type": "string" },
              "username": { "type": "string" },
              "url": { "type": "string", "format": "uri" }
            }
          }
        }
      }
    },
    "work": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "position", "startDate"],
        "properties": {
          "name": { "type": "string", "minLength": 1 },
          "position": { "type": "string", "minLength": 1 },
          "url": { "type": "string", "format": "uri" },
          "startDate": { "type": "string", "format": "date" },
          "endDate": { "type": "string", "format": "date" },
          "summary": { "type": "string" },
          "highlights": {
            "type": "array",
            "items": { "type": "string" }
          },
          "location": { "type": "string" }
        }
      }
    },
    "education": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "institution": { "type": "string" },
          "area": { "type": "string" },
          "studyType": { "type": "string" },
          "startDate": { "type": "string", "format": "date" },
          "endDate": { "type": "string", "format": "date" },
          "gpa": { "type": "string" },
          "courses": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    },
    "skills": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "level": { "type": "string" },
          "keywords": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    },
    "projects": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "description": { "type": "string" },
          "highlights": {
            "type": "array",
            "items": { "type": "string" }
          },
          "keywords": {
            "type": "array",
            "items": { "type": "string" }
          },
          "startDate": { "type": "string", "format": "date" },
          "endDate": { "type": "string", "format": "date" },
          "url": { "type": "string", "format": "uri" }
        }
      }
    },
    "awards": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "date": { "type": "string", "format": "date" },
          "awarder": { "type": "string" },
          "summary": { "type": "string" }
        }
      }
    },
    "certifications": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "date": { "type": "string", "format": "date" },
          "issuer": { "type": "string" },
          "url": { "type": "string", "format": "uri" }
        }
      }
    },
    "publications": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "publisher": { "type": "string" },
          "releaseDate": { "type": "string", "format": "date" },
          "url": { "type": "string", "format": "uri" },
          "summary": { "type": "string" }
        }
      }
    },
    "languages": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "language": { "type": "string" },
          "fluency": { "type": "string" }
        }
      }
    },
    "interests": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "keywords": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    },
    "references": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "reference": { "type": "string" }
        }
      }
    }
  }
} as const;