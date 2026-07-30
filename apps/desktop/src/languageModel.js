const CHAT_COMPLETIONS_SUFFIX = /\/chat\/completions\/?$/;

let sdkModulesPromise;

function loadSDKModules() {
  if (!sdkModulesPromise) {
    sdkModulesPromise = Promise.all([
      import('ai'),
      import('@ai-sdk/deepseek'),
      import('zod'),
    ]);
  }
  return sdkModulesPromise;
}

function getProviderBaseURL(apiEndpoint) {
  const url = new URL(apiEndpoint);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('LLM API endpoint must use HTTP or HTTPS');
  }
  url.pathname = url.pathname.replace(CHAT_COMPLETIONS_SUFFIX, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

async function createLanguageModel(config) {
  const [, { createDeepSeek }] = await loadSDKModules();

  switch (config.provider) {
    case 'deepseek': {
      const provider = createDeepSeek({
        apiKey: config.apiKey,
        baseURL: getProviderBaseURL(config.apiEndpoint),
      });
      return {
        model: provider(config.model),
        providerOptions: {
          deepseek: {
            thinking: { type: 'disabled' },
          },
        },
      };
    }
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

async function generateCalendarCreativePlan(payload) {
  const { provider, apiEndpoint, apiKey, model, system, prompt } = payload ?? {};
  if (!provider || !apiEndpoint || !apiKey || !model || !system || !prompt) {
    throw new Error('Incomplete language model request');
  }

  const [{ generateText, Output }, , { z }] = await loadSDKModules();
  const languageModel = await createLanguageModel({
    provider,
    apiEndpoint,
    apiKey,
    model,
  });
  const schema = z.object({
    quote: z.string().min(1).max(40),
    imagePrompt: z.string().min(20),
  });
  const result = await generateText({
    model: languageModel.model,
    system,
    prompt,
    output: Output.object({
      name: 'calendarCreativePlan',
      description: '每日台历文案与无文字背景图提示词',
      schema,
    }),
    providerOptions: languageModel.providerOptions,
    temperature: 0.85,
    maxOutputTokens: 1000,
  });

  return result.output;
}

module.exports = {
  generateCalendarCreativePlan,
  getProviderBaseURL,
};
