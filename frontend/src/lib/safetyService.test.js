import { localRuleSafetyCheck, evaluatePostSafety, invalidateSafetyCache } from './safetyService';

// Mock the orchestrator client so tests run deterministically without hitting network
jest.mock('./aiOrchestratorClient', () => ({
  executeAiAction: jest.fn().mockImplementation((action, payload) => {
    // If orchestrator fails or falls back
    return Promise.resolve({
      status: 'safe',
      categories: [],
      confidence: 'high',
      summary: 'Content appears consistent with Discuss community guidelines.',
      analyzedAt: new Date().toISOString(),
      analysisVersion: '2.0',
    });
  }),
}));

describe('safetyService', () => {
  describe('localRuleSafetyCheck', () => {
    it('returns safe status for normal developer discussion', () => {
      const result = localRuleSafetyCheck('Building a high-throughput microservice using Node.js and Redis.');
      expect(result.status).toBe('safe');
      expect(result.categories).toEqual([]);
      expect(result.summary).toContain('consistent with Discuss community guidelines');
    });

    it('does NOT flag civil discussions of religion, philosophy, or politics', () => {
      const religionPost = 'Exploring the philosophy of Indian and Islamic architectures and ancient political theory.';
      const result = localRuleSafetyCheck(religionPost);
      expect(result.status).toBe('safe');
      expect(result.categories).toEqual([]);
    });

    it('preserves code context: does not treat kill -9 or process.kill as violent threats', () => {
      const codePost = 'Run kill -9 to terminate the hung node process.';
      const codeSnippet = 'process.kill(pid, "SIGTERM");';
      const result = localRuleSafetyCheck(codePost, codeSnippet);
      expect(result.status).toBe('safe');
      expect(result.categories).not.toContain('threats');
    });

    it('flags direct real-world threats as high_risk', () => {
      const threatPost = 'I will kill you if you deploy this code.';
      const result = localRuleSafetyCheck(threatPost);
      expect(result.status).toBe('high_risk');
      expect(result.categories).toContain('threats');
      expect(result.summary).toContain('threatening language');
    });

    it('flags targeted abusive slurs as high_risk hate_speech', () => {
      const slurPost = 'You are a chutiya motherfucker';
      const result = localRuleSafetyCheck(slurPost);
      expect(result.status).toBe('high_risk');
      expect(result.categories).toContain('hate_speech');
    });

    it('flags personal harassment as review', () => {
      const harassmentPost = 'You are pathetic, a total moron and idiot.';
      const result = localRuleSafetyCheck(harassmentPost);
      expect(result.status).toBe('review');
      expect(result.categories).toContain('harassment');
    });

    it('flags cryptocurrency doubling scam patterns as high_risk', () => {
      const scamPost = 'Send crypto to get double return! Click here to claim free btc.';
      const result = localRuleSafetyCheck(scamPost);
      expect(result.status).toBe('high_risk');
      expect(result.categories).toContain('scams');
    });

    it('flags exposed credentials / GitHub tokens as review', () => {
      const piiPost = 'Here is my token: ghp_123456789012345678901234567890123456';
      const result = localRuleSafetyCheck(piiPost);
      expect(result.status).toBe('review');
      expect(result.categories).toContain('personal_information');
    });
  });

  describe('evaluatePostSafety caching and integrity', () => {
    it('returns structured safety result without exposing provider or model names', async () => {
      const result = await evaluatePostSafety('Hello world Discuss community', '');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('categories');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('summary');
      expect(result).not.toHaveProperty('model');
      expect(result).not.toHaveProperty('provider');
      expect(result).not.toHaveProperty('temperature');
    });

    it('reuses existing verified safety metadata if contentHash matches', async () => {
      const text = 'Testing existing hash cache';
      const { generateContentHash } = require('./scoringLogic');
      const hash = generateContentHash(`${text} `);

      const existingSafetyInfo = {
        status: 'safe',
        categories: [],
        confidence: 'high',
        summary: 'Content appears consistent with Discuss community guidelines.',
        contentHash: hash,
      };

      const result = await evaluatePostSafety(text, '', { existingSafetyInfo });
      expect(result).toBe(existingSafetyInfo);
    });

    it('supports cache invalidation when content changes', () => {
      expect(() => invalidateSafetyCache('Updated post text', '')).not.toThrow();
    });
  });
});
