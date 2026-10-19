import { Preference, Decision } from '../types';

export const MOCK_PREFERENCES: Preference[] = [
  {
    id: "pref-001",
    content: "Use arrow functions instead of function declarations",
    category: "style",
    scopeType: "project",
    scopePath: null,
    importance: 5,
    source: "explicit",
    createdAt: "2025-03-10T09:15:00Z",
    updatedAt: "2025-03-10T09:15:00Z",
    accessCount: 12
  },
  {
    id: "pref-002",
    content: "Use camelCase for all variable names",
    category: "naming",
    scopeType: "project",
    scopePath: null,
    importance: 5,
    source: "explicit",
    createdAt: "2025-03-07T14:30:00Z",
    updatedAt: "2025-03-09T11:20:00Z",
    accessCount: 8
  },
  {
    id: "pref-003",
    content: "Use Zod for schema validation instead of Joi",
    category: "tool",
    scopeType: "project",
    scopePath: null,
    importance: 6,
    source: "implicit",
    createdAt: "2025-03-05T16:45:00Z",
    updatedAt: "2025-03-05T16:45:00Z",
    accessCount: 3
  },
  {
    id: "pref-004",
    content: "In the /api folder, always add rate limiting middleware",
    category: "constraint",
    scopeType: "folder",
    scopePath: "src/api/",
    importance: 7,
    source: "explicit",
    createdAt: "2025-03-03T10:00:00Z",
    updatedAt: "2025-03-03T10:00:00Z",
    accessCount: 5
  },
  {
    id: "pref-005",
    content: "Use try-catch for error handling, avoid .then() chains",
    category: "style",
    scopeType: "project",
    scopePath: null,
    importance: 5,
    source: "implicit",
    createdAt: "2025-03-11T08:00:00Z",
    updatedAt: "2025-03-11T08:00:00Z",
    accessCount: 2
  }
];

export const MOCK_DECISIONS: Decision[] = [
  {
    id: "dec-001",
    content: "Use the Repository pattern for all database access",
    rationale: "we need to support switching from MongoDB to PostgreSQL later",
    scopeType: "project",
    scopePath: null,
    importance: 8,
    createdAt: "2025-03-08T11:00:00Z",
    updatedAt: "2025-03-08T11:00:00Z"
  }
];
