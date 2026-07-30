import { LLMModelConfig } from '../types';

export const DEEPSEEK_LLM_MODEL_PRESET: LLMModelConfig = {
  provider: 'deepseek',
  apiEndpoint: 'https://api.deepseek.com/chat/completions',
  apiKey: '',
  model: 'deepseek-v4-flash',
};

function getEnvironment(): Record<string, string | undefined> {
  const viteEnv = (import.meta as unknown as {
    env?: Record<string, string | undefined>;
  }).env ?? {};
  const processEnv = typeof process !== 'undefined' ? process.env : {};
  return { ...processEnv, ...viteEnv };
}

export function getDefaultLLMModelConfig(): LLMModelConfig {
  const env = getEnvironment();
  return {
    ...DEEPSEEK_LLM_MODEL_PRESET,
    apiEndpoint: env.VITE_DEEPSEEK_API_ENDPOINT || DEEPSEEK_LLM_MODEL_PRESET.apiEndpoint,
    model: env.VITE_DEEPSEEK_MODEL || DEEPSEEK_LLM_MODEL_PRESET.model,
  };
}

export function hasEnvironmentLLMApiKey(): boolean {
  return Boolean(getEnvironment().VITE_DEEPSEEK_API_KEY);
}

export function normalizeLLMModelConfig(config: LLMModelConfig): LLMModelConfig {
  return {
    provider: config.provider,
    apiEndpoint: config.apiEndpoint.trim(),
    apiKey: config.apiKey.trim(),
    model: config.model.trim(),
  };
}

export function resolveLLMModelConfig(config?: LLMModelConfig): LLMModelConfig {
  const env = getEnvironment();
  const normalized = normalizeLLMModelConfig(config ?? getDefaultLLMModelConfig());
  return {
    ...normalized,
    apiKey: normalized.apiKey || env.VITE_DEEPSEEK_API_KEY || '',
  };
}

export function validateLLMModelConfig(
  config: LLMModelConfig,
  requireApiKey = true
): string[] {
  const normalized = normalizeLLMModelConfig(config);
  const errors: string[] = [];

  if (!normalized.apiEndpoint) {
    errors.push('请填写 API Endpoint');
  } else {
    try {
      const url = new URL(normalized.apiEndpoint);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('API Endpoint 仅支持 HTTP(S) 地址');
      }
    } catch {
      errors.push('API Endpoint 格式不正确');
    }
  }

  if (requireApiKey && !normalized.apiKey) errors.push('请填写 API Key');
  if (!normalized.model) errors.push('请填写模型 ID');

  return errors;
}
