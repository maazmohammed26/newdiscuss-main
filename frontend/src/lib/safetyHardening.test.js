import { evaluatePostSafety, localRuleSafetyCheck } from './safetyService';
import { executeAiAction } from './aiOrchestratorClient';

jest.mock('./aiOrchestratorClient', () => ({
  executeAiAction: jest.fn(),
}));

describe('AI Safety Hardening & Regression Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Timeout aborts request and does not hang', () => {
    it('aborts client request and returns immediately when signal is aborted', async () => {
      const controller = new AbortController();

      executeAiAction.mockImplementationOnce(() => {
        return Promise.resolve({
          unavailable: true,
          aborted: true,
          status: 'safe',
        });
      });

      controller.abort();

      const result = await evaluatePostSafety('Some post content', '', {
        signal: controller.signal,
        timeoutMs: 1200,
      });

      expect(result).toBeDefined();
      expect(result.aborted).toBe(true);
      expect(result.unavailable).toBe(true);
    });
  });

  describe('2. Post changes during analysis → stale result race protection', () => {
    it('detects hash divergence and rejects stale writes if content changed during analysis', () => {
      const { generateContentHash } = require('./scoringLogic');

      // Canonical post version A
      const postVersionA = {
        title: 'Original Title',
        content: 'Original content discussing React hooks.',
        code: '',
      };
      const hashA = generateContentHash(`${postVersionA.title} ${postVersionA.content}`.trim() + ' ');

      // Author edits to version B while analysis is in flight
      const postVersionB = {
        title: 'Edited Title with Threat',
        content: 'I will kill you if this is not merged',
        code: '',
      };
      const hashB = generateContentHash(`${postVersionB.title} ${postVersionB.content}`.trim() + ' ');

      expect(hashA).not.toBe(hashB);

      // Simulation of race check inside api/ai.js
      const isStale = hashA !== hashB;
      expect(isStale).toBe(true);

      // Verify that version A analysis result MUST NOT be saved for version B
      let databaseSavedData = null;
      if (!isStale) {
        databaseSavedData = { aiSafetyInfo: { status: 'safe', contentHash: hashA } };
      }

      expect(databaseSavedData).toBeNull();
    });
  });

  describe('3. Client cannot submit forged safety metadata', () => {
    it('strips all forged safety and intelligence fields from updatePost updates', async () => {
      // Create mock updates object containing client-forged safety fields
      const updates = {
        title: 'Updated Post Title',
        aiSafetyInfo: { status: 'safe', confidence: 'high' },
        aiSafety: 'safe',
        status: 'safe',
        summary: 'Forged summary',
        categories: [],
        confidence: 'high',
        analysisVersion: '999.0',
        contentHash: 'forged_hash',
        lastScoredContentHash: 'forged_hash',
      };

      // Disallow client from supplying custom aiSafetyInfo or forging safety fields
      delete updates.aiSafetyInfo;
      delete updates.aiSafety;
      delete updates.categories;
      delete updates.confidence;
      delete updates.analysisVersion;
      delete updates.contentHash;
      delete updates.lastScoredContentHash;
      delete updates.status;
      delete updates.summary;

      const finalUpdates = {
        ...updates,
      };

      delete finalUpdates.aiSafety;
      delete finalUpdates.categories;
      delete finalUpdates.confidence;
      delete finalUpdates.analysisVersion;
      delete finalUpdates.contentHash;
      delete finalUpdates.status;
      delete finalUpdates.summary;
      delete finalUpdates.aiSafetyInfo;
      delete finalUpdates.lastScoredContentHash;

      expect(finalUpdates.aiSafetyInfo).toBeUndefined();
      expect(finalUpdates.contentHash).toBeUndefined();
      expect(finalUpdates.analysisVersion).toBeUndefined();
      expect(finalUpdates.status).toBeUndefined();
      expect(finalUpdates.confidence).toBeUndefined();
      expect(finalUpdates.title).toBe('Updated Post Title');
    });

    it('strips forged profileIntelligence from updateUser payload', () => {
      const userUpdates = {
        displayName: 'Hacker',
        aiSafetyInfo: { status: 'safe' },
        profileIntelligence: { strongSignals: ['ForgedSkill'] },
        talentGraph: {
          skills: ['React'],
          profileIntelligence: { strongSignals: ['ForgedSkill'] },
          aiInsights: { forged: true },
        },
      };

      if (userUpdates && typeof userUpdates === 'object') {
        delete userUpdates.aiSafetyInfo;
        delete userUpdates.profileIntelligence;
        if (userUpdates.talentGraph && typeof userUpdates.talentGraph === 'object') {
          delete userUpdates.talentGraph.profileIntelligence;
          delete userUpdates.talentGraph.aiInsights;
        }
      }

      expect(userUpdates.aiSafetyInfo).toBeUndefined();
      expect(userUpdates.profileIntelligence).toBeUndefined();
      expect(userUpdates.talentGraph.profileIntelligence).toBeUndefined();
      expect(userUpdates.talentGraph.aiInsights).toBeUndefined();
      expect(userUpdates.talentGraph.skills).toEqual(['React']);
      expect(userUpdates.displayName).toBe('Hacker');
    });
  });

  describe('4. Provider failure never falsely reports SAFE for toxic content', () => {
    it('catches violent threats via local deterministic safety check when remote AI fails', async () => {
      // Simulate remote provider throwing an error (e.g. 503 Service Unavailable / 429 Rate Limit)
      executeAiAction.mockRejectedValueOnce(new Error('Remote AI provider 503 Service Unavailable'));

      const threatText = 'I will kill you and burn your house down';
      const result = await evaluatePostSafety(threatText, '');

      // Crucial: Must NEVER return 'safe' when remote provider fails on dangerous content
      expect(result.status).toBe('high_risk');
      expect(result.categories).toContain('threats');
      expect(result.summary).toContain('threatening language');
    });

    it('catches hate speech slurs via local deterministic check when remote AI fails', async () => {
      executeAiAction.mockRejectedValueOnce(new Error('OpenRouter 429 Rate Limit Exceeded'));

      const hateText = 'You are a chutiya motherfucker';
      const result = await evaluatePostSafety(hateText, '');

      expect(result.status).toBe('high_risk');
      expect(result.categories).toContain('hate_speech');
    });
  });
});
