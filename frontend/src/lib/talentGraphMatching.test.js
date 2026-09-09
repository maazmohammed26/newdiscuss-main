import { computeWeightedDeveloperMatches, extractSkillsFromText } from './talentGraphMatching';

describe('talentGraphMatching', () => {
  const currentUser = {
    id: 'user-me',
    username: 'alexdev',
    talentGraph: {
      skills: ['react', 'typescript', 'tailwind'],
      bio: 'Frontend architect building modern web interfaces',
    },
  };

  const candidateUsers = [
    {
      id: 'user-backend',
      username: 'sarah_be',
      talentGraph: {
        skills: ['node', 'postgresql', 'go', 'react'],
        bio: 'Backend engineer focused on distributed systems and APIs',
      },
      postCount: 5,
    },
    {
      id: 'user-frontend',
      username: 'chris_fe',
      talentGraph: {
        skills: ['react', 'vue', 'css'],
        bio: 'UI enthusiast',
      },
      postCount: 2,
    },
    {
      id: 'user-ai',
      username: 'elena_ai',
      talentGraph: {
        skills: ['python', 'pytorch', 'ai'],
        bio: 'AI engineer training vision and language models',
      },
      postCount: 8,
    },
    {
      id: 'user-blocked',
      username: 'spammer',
      isBlocked: true,
      talentGraph: {
        skills: ['react', 'node'],
      },
    },
  ];

  describe('extractSkillsFromText', () => {
    it('extracts technical skills from natural sentences', () => {
      const text = 'I build scalable microservices using Go, Docker, and PostgreSQL with a React dashboard.';
      const extracted = extractSkillsFromText(text);
      expect(extracted).toContain('go');
      expect(extracted).toContain('docker');
      expect(extracted).toContain('postgresql');
      expect(extracted).toContain('react');
    });
  });

  describe('computeWeightedDeveloperMatches', () => {
    it('computes matches prioritizing shared skills and complementary strengths', () => {
      const matches = computeWeightedDeveloperMatches(currentUser, candidateUsers);
      expect(matches.length).toBeGreaterThan(0);

      // Backend candidate shares React and has complementary backend skills
      const backendMatch = matches.find((m) => m.userId === 'user-backend');
      expect(backendMatch).toBeDefined();
      expect(backendMatch.sharedSkills).toContain('react');
      expect(backendMatch.complementaryStrengths).toBeDefined();
      expect(backendMatch.matchTier).toMatch(/Strong match|Good match/);
    });

    it('excludes self from matches', () => {
      const withSelf = [...candidateUsers, { ...currentUser, id: 'user-me' }];
      const matches = computeWeightedDeveloperMatches(currentUser, withSelf);
      expect(matches.some((m) => m.userId === 'user-me')).toBe(false);
    });

    it('excludes blocked users from matches', () => {
      const matches = computeWeightedDeveloperMatches(currentUser, candidateUsers);
      expect(matches.some((m) => m.userId === 'user-blocked')).toBe(false);
    });

    it('does NOT exclude developers merely because they have chatted before', () => {
      // Per Requirement 11: having chatted before does not disqualify someone as a useful match
      const existingChatPartnerIds = new Set(['user-backend', 'user-frontend']);
      const matches = computeWeightedDeveloperMatches(currentUser, candidateUsers, { existingChatPartnerIds });
      expect(matches.some((m) => m.userId === 'user-backend')).toBe(true);
      expect(matches.some((m) => m.userId === 'user-frontend')).toBe(true);
    });

    it('generates factual matchReason without model or provider names', () => {
      const matches = computeWeightedDeveloperMatches(currentUser, candidateUsers);
      for (const m of matches) {
        expect(m.matchReason).toBeDefined();
        expect(m.matchReason).not.toMatch(/Gemini|OpenRouter|Claude|ChatGPT|Llama|Mars/i);
      }
    });
  });
});
