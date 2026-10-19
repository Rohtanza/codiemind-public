import { MockResponse, Preference, Decision } from '../types';
import { parseCommand, detectImplicitPreference } from '../commands/commandParser';
import { MOCK_PREFERENCES, MOCK_DECISIONS } from './mockData';
import { generateId } from '../utils/helpers';

let preferences: Preference[] = [...MOCK_PREFERENCES];
let decisions: Decision[] = [...MOCK_DECISIONS];

export function getPreferences(): Preference[] {
  return preferences;
}

export function getDecisions(): Decision[] {
  return decisions;
}

export function getMemoryCount(): number {
  return preferences.length + decisions.length;
}

export function resetMockData(): void {
  preferences = [...MOCK_PREFERENCES];
  decisions = [...MOCK_DECISIONS];
}

export function addPreference(pref: Preference): void {
  preferences.push(pref);
}

export function addDecision(dec: Decision): void {
  decisions.push(dec);
}

export function deletePreference(id: string): boolean {
  const index = preferences.findIndex(p => p.id === id);
  if (index !== -1) {
    preferences.splice(index, 1);
    return true;
  }
  return false;
}

export function updatePreference(id: string, updates: Partial<Preference>): boolean {
  const index = preferences.findIndex(p => p.id === id);
  if (index !== -1) {
    preferences[index] = { ...preferences[index], ...updates, updatedAt: new Date().toISOString() };
    return true;
  }
  return false;
}

export function deleteDecision(id: string): boolean {
  const index = decisions.findIndex(d => d.id === id);
  if (index !== -1) {
    decisions.splice(index, 1);
    return true;
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(): Promise<void> {
  return delay(800 + Math.random() * 700);
}

export async function processMessage(input: string): Promise<MockResponse> {
  await randomDelay();

  const parsed = parseCommand(input);

  switch (parsed.type) {
    case 'remember': {
      const now = new Date().toISOString();
      const newPref: Preference = {
        id: generateId(),
        content: parsed.text,
        category: 'style',
        scopeType: parsed.scope || 'project',
        scopePath: null,
        importance: 5,
        source: 'explicit',
        createdAt: now,
        updatedAt: now,
        accessCount: 0
      };
      preferences.push(newPref);
      return {
        type: 'system',
        text: `✓ Preference stored: ${parsed.text} [style · ${parsed.scope || 'project'} · ★5/10]`,
        storedPreference: newPref
      };
    }

    case 'decide': {
      const now = new Date().toISOString();
      const newDec: Decision = {
        id: generateId(),
        content: parsed.text,
        rationale: parsed.rationale || null,
        scopeType: 'project',
        scopePath: null,
        importance: 8,
        createdAt: now,
        updatedAt: now
      };
      decisions.push(newDec);
      let responseText = `✓ Decision stored: ${parsed.text}`;
      if (parsed.rationale) {
        responseText += `\nRationale: ${parsed.rationale}`;
      }
      responseText += `\n[architecture · project · ★8/10]`;
      return {
        type: 'system',
        text: responseText,
        storedDecision: newDec
      };
    }

    case 'forget': {
      const keyword = parsed.text.toLowerCase();
      const matchIndex = preferences.findIndex(p =>
        p.content.toLowerCase().includes(keyword)
      );
      if (matchIndex !== -1) {
        const removed = preferences.splice(matchIndex, 1)[0];
        return {
          type: 'system',
          text: `✓ Deleted: '${removed.content}'`
        };
      }
      return {
        type: 'system',
        text: 'No matching preference found.'
      };
    }

    case 'memories': {
      const allMemories: Preference[] = [
        ...preferences,
        ...decisions.map(d => ({
          id: d.id,
          content: d.content,
          category: 'architecture' as const,
          scopeType: d.scopeType,
          scopePath: d.scopePath,
          importance: d.importance,
          source: 'explicit' as const,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          accessCount: 0
        }))
      ];

      if (allMemories.length === 0) {
        return {
          type: 'system',
          text: 'No preferences stored yet. Use @remember to add one.'
        };
      }

      return {
        type: 'memories',
        text: 'Stored Memories',
        memories: allMemories
      };
    }

    case 'context': {
      return {
        type: 'context',
        text: 'Context Assembly for Last Query',
        contextSlots: [
          { slot: 1, name: "User Query (Primacy)", tokens: 24, content: "Create a function to validate email addresses" },
          { slot: 2, name: "Episodic Preferences", tokens: 156, content: "2 preferences retrieved: arrow functions (style, ★5), camelCase (naming, ★5)" },
          { slot: 3, name: "Project Decisions", tokens: 89, content: "1 decision: Repository pattern (architecture, ★8)" },
          { slot: 4, name: "Code Context", tokens: 412, content: "3 code chunks from src/utils/validation.ts, src/models/user.ts, src/types/index.ts" },
          { slot: 5, name: "Conversation History", tokens: 203, content: "Last 4 conversation turns" },
          { slot: 6, name: "Repeated User Query (Recency)", tokens: 24, content: "Create a function to validate email addresses" }
        ],
        totalTokens: 908,
        budgetLimit: 4096
      };
    }

    case 'chat': {
      if (detectImplicitPreference(input)) {
        return {
          type: 'confirmation',
          text: 'I detected a preference in your message:',
          detectedPreference: 'Use try-catch for error handling, avoid .then() chains',
          suggestedCategory: 'style',
          suggestedScope: 'project'
        };
      }

      if (input.toLowerCase().includes('validate') && input.toLowerCase().includes('email')) {
        return {
          type: 'assistant',
          text: "Here's an email validation function using your preferred arrow function style:\n\n```typescript\nconst validateEmail = (email: string): boolean => {\n  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n  return emailRegex.test(email);\n};\n\nexport { validateEmail };\n```\n\nThis uses arrow function syntax as per your stored preference and camelCase naming convention.",
          appliedPreferences: [
            { content: "Use arrow functions instead of function declarations", category: "style" },
            { content: "Use camelCase for all variable names", category: "naming" }
          ]
        };
      }

      return {
        type: 'assistant',
        text: "Here's a basic Express REST API setup using your project conventions:\n\n```typescript\nimport express from 'express';\nimport { validateEmail } from './utils/validation';\n\nconst app = express();\nconst PORT = 3000;\n\napp.use(express.json());\n\nconst getUsers = async (req: express.Request, res: express.Response) => {\n  try {\n    const users = await userRepository.findAll();\n    res.json(users);\n  } catch (error) {\n    res.status(500).json({ error: 'Failed to fetch users' });\n  }\n};\n\napp.get('/api/users', getUsers);\n\napp.listen(PORT, () => {\n  console.log(`Server running on port ${PORT}`);\n});\n```\n\nNote: I used arrow functions, try-catch error handling, and the Repository pattern as per your stored preferences.",
        appliedPreferences: [
          { content: "Use arrow functions instead of function declarations", category: "style" },
          { content: "Use try-catch for error handling, avoid .then() chains", category: "style" },
          { content: "Use the Repository pattern for all database access", category: "architecture" }
        ]
      };
    }
  }
}
