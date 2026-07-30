import React, { useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  Image as ImageIcon,
  MessageSquare,
  RotateCcw,
  Settings2,
  ShieldAlert,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ImageModelConfig,
  ImageModelProvider,
  LLMModelConfig,
} from '../types';
import {
  getDefaultImageModelConfig,
  normalizeImageModelConfig,
  OPENAI_IMAGE_MODEL_PRESET,
  resolveImageModelConfig,
  validateImageModelConfig,
  VOLCENGINE_IMAGE_MODEL_PRESET,
} from '../services/imageModelConfig';
import {
  DEEPSEEK_LLM_MODEL_PRESET,
  getDefaultLLMModelConfig,
  normalizeLLMModelConfig,
  resolveLLMModelConfig,
  validateLLMModelConfig,
} from '../services/llmModelConfig';

interface ImageModelSettingsProps {
  imageConfig: ImageModelConfig;
  llmConfig: LLMModelConfig;
  onSaveImage: (config: ImageModelConfig) => void;
  onSaveLLM: (config: LLMModelConfig) => void;
  onClose: () => void;
}

const IMAGE_PROVIDERS: Array<{
  id: ImageModelProvider;
  name: string;
  description: string;
}> = [
  {
    id: 'volcengine',
    name: '火山引擎 Seedream',
    description: '方舟 Images API，支持当前摄像头参考图模式',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: '官方 Images API，支持生成和参考图编辑',
  },
];

type SettingsTab = 'llm' | 'image';

export const ImageModelSettings: React.FC<ImageModelSettingsProps> = ({
  imageConfig,
  llmConfig,
  onSaveImage,
  onSaveLLM,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('llm');
  const [imageDraft, setImageDraft] = useState<ImageModelConfig>(imageConfig);
  const [llmDraft, setLLMDraft] = useState<LLMModelConfig>(llmConfig);
  const [showApiKey, setShowApiKey] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleImageProviderChange = (provider: ImageModelProvider) => {
    setImageDraft(provider === 'volcengine'
      ? { ...VOLCENGINE_IMAGE_MODEL_PRESET }
      : { ...OPENAI_IMAGE_MODEL_PRESET });
    setErrors([]);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (activeTab === 'llm') {
      const nextLLMConfig = {
        ...llmDraft,
        apiEndpoint: DEEPSEEK_LLM_MODEL_PRESET.apiEndpoint,
      };
      const validationErrors = validateLLMModelConfig(resolveLLMModelConfig(nextLLMConfig));
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }
      onSaveLLM(normalizeLLMModelConfig(nextLLMConfig));
    } else {
      const preset = imageDraft.provider === 'openai'
        ? OPENAI_IMAGE_MODEL_PRESET
        : VOLCENGINE_IMAGE_MODEL_PRESET;
      const nextImageConfig = {
        ...imageDraft,
        apiEndpoint: imageDraft.provider === 'openai'
          ? imageDraft.apiEndpoint
          : preset.apiEndpoint,
      };
      const validationErrors = validateImageModelConfig(
        resolveImageModelConfig(nextImageConfig)
      );
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }
      onSaveImage(normalizeImageModelConfig(nextImageConfig));
    }

    onClose();
  };

  const switchTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    setShowApiKey(false);
    setErrors([]);
  };

  const currentApiKey = activeTab === 'llm' ? llmDraft.apiKey : imageDraft.apiKey;

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-[1100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.form
        className="fixed inset-x-4 top-[8%] max-w-2xl mx-auto bg-[#fdfbf7] rounded-2xl shadow-[0_30px_90px_rgba(35,30,25,0.28)] border border-white z-[1101] overflow-hidden"
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-black text-white">
              <Settings2 size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-black/85">AI 模型配置</h2>
              <p className="text-[10px] text-black/40 mt-0.5">
                文案与视觉 Prompt、生图服务分别配置
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭 AI 模型配置"
            onClick={onClose}
            className="p-2 rounded-full text-black/35 hover:text-black hover:bg-black/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 mx-6 mt-5 p-1 rounded-xl bg-black/[0.04]">
          <button
            type="button"
            onClick={() => switchTab('llm')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'llm' ? 'bg-white text-black shadow-sm' : 'text-black/40'
            }`}
          >
            <MessageSquare size={14} />
            文案与 Prompt
          </button>
          <button
            type="button"
            onClick={() => switchTab('image')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'image' ? 'bg-white text-black shadow-sm' : 'text-black/40'
            }`}
          >
            <ImageIcon size={14} />
            生图模型
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[64vh] overflow-y-auto">
          {activeTab === 'llm' ? (
            <>
              <div className="relative p-4 rounded-xl border border-black bg-black text-white shadow-lg">
                <Check size={14} className="absolute right-3 top-3" />
                <div className="text-xs font-bold pr-5">DeepSeek</div>
                <div className="text-[10px] leading-relaxed mt-1.5 text-white/55">
                  一次生成每日文案和可直接提交给生图模型的视觉 Prompt
                </div>
              </div>

              <ApiKeyField
                value={llmDraft.apiKey}
                show={showApiKey}
                placeholder="输入 DeepSeek API Key"
                onToggle={() => setShowApiKey((current) => !current)}
                onChange={(value) => {
                  setLLMDraft((current) => ({ ...current, apiKey: value }));
                  setErrors([]);
                }}
              />
              <ConfigField
                label="模型 ID"
                value={llmDraft.model}
                placeholder={DEEPSEEK_LLM_MODEL_PRESET.model}
                onChange={(value) => {
                  setLLMDraft((current) => ({ ...current, model: value }));
                  setErrors([]);
                }}
              />
            </>
          ) : (
            <>
              <fieldset>
                <legend className="text-[10px] uppercase tracking-[0.18em] font-bold text-black/40 mb-3">
                  服务类型
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {IMAGE_PROVIDERS.map((provider) => {
                    const selected = imageDraft.provider === provider.id;
                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => handleImageProviderChange(provider.id)}
                        className={`relative p-4 rounded-xl border text-left transition-all ${
                          selected
                            ? 'border-black bg-black text-white shadow-lg'
                            : 'border-black/10 bg-white/70 text-black hover:border-black/30'
                        }`}
                      >
                        {selected && <Check size={14} className="absolute right-3 top-3" />}
                        <div className="text-xs font-bold pr-5">{provider.name}</div>
                        <div className={`text-[10px] leading-relaxed mt-1.5 ${
                          selected ? 'text-white/55' : 'text-black/40'
                        }`}>
                          {provider.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {imageDraft.provider === 'openai' && (
                <ConfigField
                  label="API Endpoint"
                  value={imageDraft.apiEndpoint}
                  placeholder={OPENAI_IMAGE_MODEL_PRESET.apiEndpoint}
                  onChange={(value) => {
                    setImageDraft((current) => ({ ...current, apiEndpoint: value }));
                    setErrors([]);
                  }}
                />
              )}
              <ApiKeyField
                value={imageDraft.apiKey}
                show={showApiKey}
                placeholder="输入生图服务 API Key"
                onToggle={() => setShowApiKey((current) => !current)}
                onChange={(value) => {
                  setImageDraft((current) => ({ ...current, apiKey: value }));
                  setErrors([]);
                }}
              />
              <ConfigField
                label="模型 ID"
                value={imageDraft.model}
                placeholder={imageDraft.provider === 'openai'
                  ? OPENAI_IMAGE_MODEL_PRESET.model
                  : VOLCENGINE_IMAGE_MODEL_PRESET.model}
                onChange={(value) => {
                  setImageDraft((current) => ({ ...current, model: value }));
                  setErrors([]);
                }}
              />
            </>
          )}

          {errors.length > 0 && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">
              {errors.join('；')}
            </div>
          )}

          <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <ShieldAlert size={15} className="text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed text-amber-800/75">
              手动填写的密钥仅保存在当前设备且不会加密。公共设备建议使用环境变量。
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-black/5 bg-black/[0.02] flex items-center justify-between gap-3">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'llm') {
                  setLLMDraft(getDefaultLLMModelConfig());
                } else {
                  setImageDraft(getDefaultImageModelConfig());
                }
                setErrors([]);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-black/45 hover:text-black transition-colors"
            >
              <RotateCcw size={13} />
              恢复默认
            </button>
            {currentApiKey && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'llm') {
                    onSaveLLM({ ...normalizeLLMModelConfig(llmDraft), apiKey: '' });
                  } else {
                    onSaveImage({ ...normalizeImageModelConfig(imageDraft), apiKey: '' });
                  }
                  onClose();
                }}
                className="px-3 py-2 text-[10px] font-bold text-red-600/65 hover:text-red-700 transition-colors"
              >
                清除本地密钥
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-black/55 hover:bg-black/5"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-black text-white text-xs font-bold shadow-lg hover:bg-black/80 active:scale-95 transition-all"
            >
              保存配置
            </button>
          </div>
        </div>
      </motion.form>
    </>
  );
};

interface ConfigFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

const ConfigField: React.FC<ConfigFieldProps> = ({
  label,
  value,
  placeholder,
  onChange,
}) => (
  <label className="block">
    <span className="block text-[10px] uppercase tracking-[0.16em] font-bold text-black/40 mb-2">
      {label}
    </span>
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white text-xs text-black outline-none focus:border-black/50 transition-colors"
    />
  </label>
);

interface ApiKeyFieldProps {
  value: string;
  show: boolean;
  placeholder: string;
  onToggle: () => void;
  onChange: (value: string) => void;
}

const ApiKeyField: React.FC<ApiKeyFieldProps> = ({
  value,
  show,
  placeholder,
  onToggle,
  onChange,
}) => (
  <label className="block">
    <span className="block text-[10px] uppercase tracking-[0.16em] font-bold text-black/40 mb-2">
      API Key
    </span>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full px-4 py-3 pr-12 rounded-xl border border-black/10 bg-white text-xs text-black outline-none focus:border-black/50 transition-colors"
      />
      <button
        type="button"
        aria-label={show ? '隐藏 API Key' : '显示 API Key'}
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/35 hover:text-black"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  </label>
);

export default ImageModelSettings;
