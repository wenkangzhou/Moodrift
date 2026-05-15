# Moodrift

Moodrift 是一个基于情绪和场景生成音乐氛围的 Next.js 应用。它不是传统播放器，而是让用户通过能量、环境、活动和情绪参数进入某种状态：页面会生成对应的氛围标题、描述、BPM、标签、动态视觉背景和可播放的生成式声音。

## 功能概览

- 情绪控制：通过能量滑杆，以及环境、活动、情绪选项组合生成氛围。
- 双语界面：内置中文和英文路由，默认入口会跳转到 `/zh`。
- 动态视觉：使用 Three.js / React Three Fiber 渲染情绪球和背景氛围。
- 生成式音频：基于 Web Audio 的本地生成式声音，不依赖真实音频文件播放。
- AI 氛围生成：可通过 Moonshot / Kimi API 生成标题、描述、标签和 BPM。
- 本地兜底数据：AI 不可用时会使用本地 preset 继续展示可用结果。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Three.js, `@react-three/fiber`, `@react-three/drei`
- Zustand
- i18next, react-i18next
- shadcn / Base UI 风格组件

## 本地运行

安装依赖：

```bash
yarn install
```

启动开发服务：

```bash
yarn dev
```

项目默认运行在：

```text
http://localhost:4548
```

常用入口：

```text
http://localhost:4548/zh
http://localhost:4548/en
```

## 环境变量

AI 生成功能需要配置 Moonshot API Key：

```bash
MOONSHOT_API_KEY=your_api_key_here
```

如果没有配置该变量，AI 生成接口会返回错误，但页面仍会使用本地生成的氛围数据继续工作。

## 常用脚本

```bash
yarn dev
```

启动开发服务器，端口为 `4548`。

```bash
yarn build
```

生成生产构建。

```bash
yarn start
```

启动生产服务。需要先执行 `yarn build`。

```bash
yarn lint
```

运行 ESLint 检查。

## 目录结构

```text
src/app
  page.tsx                       # 根路由，跳转到 /zh
  [locale]/                      # 多语言页面
  api/generate-atmosphere/       # AI 氛围生成接口

src/components
  MoodControls.tsx               # 情绪与场景控制面板
  MoodOrb.tsx                    # 3D 情绪球
  MoodBackground.tsx             # 背景氛围
  AmbientPlayer.tsx              # 环境声音入口
  MoodOutput.tsx                 # 氛围结果和推荐声音
  AudioPlayer.tsx                # 单条生成式音频播放

src/hooks
  useAtmosphere.ts               # AI 氛围请求
  useAudioPlayer.ts              # 音频播放状态

src/lib
  moods.ts                       # 本地氛围生成逻辑
  generative-audio.ts            # Web Audio 生成式音频
  music-theory.ts                # 音阶和音乐理论工具
  ambient-synth.ts               # 氛围合成器

src/locales
  zh/common.json                 # 中文文案
  en/common.json                 # 英文文案
```

## 当前运行状态

最近一次本地检查结果：

- `yarn dev` 可启动，服务运行在 `4548`。
- Chrome 访问 `http://localhost:4548/zh` 页面可正常显示。
- DevTools 中页面请求为 200，控制台没有运行时 error。
- `yarn build` 可通过。
- `yarn lint` 当前仍有 React hooks 规则相关问题和少量未使用变量 warning，需要后续清理。

## 开发提示

- 根路径 `/` 会自动重定向到 `/zh`。
- 视觉和音频状态主要由 `useAppStore` 中的 mood 参数驱动。
- AI 生成接口只负责生成文案和 BPM，音频播放仍由本地生成式音频逻辑完成。
- 远程图片来源需要在 `next.config.ts` 的 `images.remotePatterns` 中声明。
