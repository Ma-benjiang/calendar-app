import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateCalendarImage } from '../services/seedreamService';
import { ImageGenerationParams, ThemeType } from '../types';

describe('seedreamService', () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ url: 'https://example.com/image.png' }]
      })
    });
    // Mock import.meta.env
    vi.stubGlobal('import', { 
      meta: { 
        env: { 
          VITE_SEEDREAM_API_KEY: 'test-key',
          VITE_SEEDREAM_MODEL: 'test-model'
        } 
      } 
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateCalendarImage', () => {
    const mockParams: ImageGenerationParams = {
      date: new Date(2026, 2, 3),
      theme: 'vintage' as ThemeType,
      quote: '春风得意马蹄疾',
      quality: 'standard',
    };

    it('should generate image successfully', async () => {
      const result = await generateCalendarImage(mockParams);
      expect(result.url).toBe('https://example.com/image.png');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should be a function', () => {
      expect(typeof generateCalendarImage).toBe('function');
    });
  });
});
