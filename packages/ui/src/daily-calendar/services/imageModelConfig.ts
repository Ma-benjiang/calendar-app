import { ImageModelConfig, ImageModelProvider } from '../types';

export const VOLCENGINE_IMAGE_MODEL_PRESET: ImageModelConfig = {
  provider: 'volcengine',
  apiEndpoint: '/volces-api/api/v3/images/generations',
  apiKey: '',
  model: 'doubao-seedream-5-0-260128',
};

export const OPENAI_IMAGE_MODEL_PRESET: ImageModelConfig = {
  provider: 'openai',
  apiEndpoint: 'https://api.openai.com/v1/images/generations',
  apiKey: '',
  model: 'gpt-image-2',
};

function getEnvironment(): Record<string, string | undefined> {
  const viteEnv = (import.meta as unknown as {
    env?: Record<string, string | undefined>;
  }).env ?? {};
  const processEnv = typeof process !== 'undefined' ? process.env : {};
  return { ...processEnv, ...viteEnv };
}

export function getDefaultImageModelConfig(): ImageModelConfig {
  const env = getEnvironment();
  return {
    ...VOLCENGINE_IMAGE_MODEL_PRESET,
    apiEndpoint: env.VITE_SEEDREAM_API_ENDPOINT || VOLCENGINE_IMAGE_MODEL_PRESET.apiEndpoint,
    model: env.VITE_SEEDREAM_MODEL || VOLCENGINE_IMAGE_MODEL_PRESET.model,
  };
}

export function hasEnvironmentImageApiKey(provider?: ImageModelProvider): boolean {
  const env = getEnvironment();
  if (provider === 'openai') return Boolean(env.VITE_OPENAI_API_KEY);
  if (provider === 'volcengine') return Boolean(env.VITE_SEEDREAM_API_KEY);
  return Boolean(env.VITE_SEEDREAM_API_KEY || env.VITE_OPENAI_API_KEY);
}

export function normalizeImageModelConfig(config: ImageModelConfig): ImageModelConfig {
  return {
    provider: config.provider,
    apiEndpoint: config.apiEndpoint.trim(),
    apiKey: config.apiKey.trim(),
    model: config.model.trim(),
  };
}

export function resolveImageModelConfig(config?: ImageModelConfig): ImageModelConfig {
  const env = getEnvironment();
  const normalized = normalizeImageModelConfig(config ?? getDefaultImageModelConfig());
  const environmentApiKey = normalized.provider === 'openai'
    ? env.VITE_OPENAI_API_KEY
    : normalized.provider === 'volcengine'
      ? env.VITE_SEEDREAM_API_KEY
      : '';
  return {
    ...normalized,
    apiKey: normalized.apiKey || environmentApiKey || '',
  };
}

export function validateImageModelConfig(config: ImageModelConfig): string[] {
  const normalized = normalizeImageModelConfig(config);
  const errors: string[] = [];

  if (!normalized.apiEndpoint) {
    errors.push('请填写 API Endpoint');
  } else if (!normalized.apiEndpoint.startsWith('/')) {
    try {
      const url = new URL(normalized.apiEndpoint);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('API Endpoint 仅支持 HTTP(S) 地址或站内代理路径');
      }
    } catch {
      errors.push('API Endpoint 格式不正确');
    }
  }

  if (!normalized.apiKey) errors.push('请填写 API Key');
  if (!normalized.model) errors.push('请填写模型 ID');

  return errors;
}
