import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateCalendarImage,
  seedreamService,
} from '../services/seedreamService';
import { ImageGenerationParams, ImageModelConfig, ThemeType } from '../types';

describe('seedreamService', () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ url: 'https://example.com/image.png' }]
      })
    });
    vi.stubEnv('VITE_SEEDREAM_API_KEY', 'test-key');
    vi.stubEnv('VITE_SEEDREAM_MODEL', 'test-model');
  });

  afterEach(() => {
    delete (window as unknown as { calendarDesktop?: unknown }).calendarDesktop;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('generateCalendarImage', () => {
    const mockParams: ImageGenerationParams = {
      date: new Date(2026, 2, 3),
      theme: 'vintage' as ThemeType,
      quote: '春风得意马蹄疾',
      size: '2K',
      quality: 'standard',
    };

    it('should generate image successfully', async () => {
      const result = await generateCalendarImage(mockParams);
      expect(result.url).toBe('https://example.com/image.png');
      expect(result.metadata.size).toBe('2K');
      expect(result.metadata.model).toBe('test-model');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should use the configured endpoint, key and model', async () => {
      const config: ImageModelConfig = {
        provider: 'volcengine',
        apiEndpoint: 'https://images.example.com/api/v3/images/generations',
        apiKey: 'custom-key',
        model: 'custom-image-model',
      };

      await generateCalendarImage(mockParams, config);

      const [endpoint, request] = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(request?.body as string);
      expect(endpoint).toBe(config.apiEndpoint);
      expect(request?.headers).toMatchObject({
        Authorization: 'Bearer custom-key',
      });
      expect(body.model).toBe(config.model);
    });

    it('should request images through the desktop bridge when available', async () => {
      const request = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          data: [{ url: 'https://example.com/desktop-image.png' }],
        },
      });
      (window as unknown as {
        calendarDesktop: { ai: { request: typeof request } };
      }).calendarDesktop = { ai: { request } };

      const result = await generateCalendarImage(mockParams);

      expect(result.url).toBe('https://example.com/desktop-image.png');
      expect(request).toHaveBeenCalledWith(expect.objectContaining({
        endpoint: '/volces-api/api/v3/images/generations',
        apiKey: 'test-key',
      }));
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should reject incomplete model configuration before requesting', async () => {
      await expect(generateCalendarImage(mockParams, {
        provider: 'volcengine',
        apiEndpoint: '',
        apiKey: '',
        model: '',
      })).rejects.toThrow('生图模型配置不完整');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should support GPT Image 2 base64 responses', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ b64_json: 'ZmFrZS1pbWFnZQ==' }],
        }),
      } as Response);
      const config: ImageModelConfig = {
        provider: 'openai',
        apiEndpoint: 'https://api.openai.com/v1/images/generations',
        apiKey: 'openai-key',
        model: 'gpt-image-2',
      };

      const result = await generateCalendarImage({
        ...mockParams,
        visualPrompt: '一幅无文字的春日静物摄影，柔和自然光，留白构图，细节丰富',
      }, config);

      const [endpoint, request] = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(request?.body as string);
      expect(endpoint).toBe(config.apiEndpoint);
      expect(body).toMatchObject({
        model: 'gpt-image-2',
        size: '2048x2048',
        quality: 'medium',
      });
      expect(body.response_format).toBeUndefined();
      expect(result.url).toBe('data:image/png;base64,ZmFrZS1pbWFnZQ==');
      expect(result.metadata.provider).toBe('openai');
    });

    it('should use the GPT Image 2 edits endpoint for a reference image', async () => {
      const request = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          data: [{ b64_json: 'ZWRpdGVkLWltYWdl' }],
        },
      });
      (window as unknown as {
        calendarDesktop: { ai: { request: typeof request } };
      }).calendarDesktop = { ai: { request } };

      await seedreamService.generateImage({
        ...mockParams,
        refImage: 'data:image/jpeg;base64,ZmFrZQ==',
      }, {
        provider: 'openai',
        apiEndpoint: 'https://api.openai.com/v1/images/generations',
        apiKey: 'openai-key',
        model: 'gpt-image-2',
      });

      expect(request).toHaveBeenCalledWith(expect.objectContaining({
        endpoint: 'https://api.openai.com/v1/images/edits',
        multipart: expect.objectContaining({
          imageDataUrl: 'data:image/jpeg;base64,ZmFrZQ==',
          imageField: 'image',
        }),
      }));
    });

    it('should be a function', () => {
      expect(typeof generateCalendarImage).toBe('function');
    });
  });
});
