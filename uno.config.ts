import { defineConfig, presetWind3 } from 'unocss'

export default defineConfig({
  presets: [presetWind3()],
  theme: {
    colors: {
      brand: '#E36B4C',
      'brand-pressed': '#C95538',
      'brand-soft': '#FFF1EB',
      bg: '#FFF8F3',
      workspace: '#F3EEE8',
      well: '#D9D3C9',
      surface: '#FFFFFF',
      ink: '#2B2420',
      'ink-2': '#6B625C',
      'ink-3': '#9A918A',
      line: '#E8E0D8',
      ok: '#2F9E6B',
      warn: '#C9842A',
      danger: '#D14B4B',
    },
    fontFamily: {
      sans: '"Plus Jakarta Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
    },
  },
})
