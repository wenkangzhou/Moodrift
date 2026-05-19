# Moodrift

Moodrift 是一个基于情绪和场景生成音乐氛围的沉浸式 Web 应用。它不是传统播放器——用户通过调节能量、环境、活动和情绪参数进入某种状态，AI 会为当前 mood 精准挑选歌单并生成对应的氛围文案，同时动态视觉背景会随音乐氛围实时变化。

## 功能概览

- **情绪控制**：通过能量滑杆，以及环境、活动、情绪选项组合生成氛围。
- **AI 音乐策展**：点击"AI 策展"，Kimi 基于当前 mood（环境+活动+情绪+能量）从曲库目录中挑选 1-3 个最匹配的歌单，重新组池并切换。
- **单屏沉浸式交互**：所有操作在一屏内完成，切换环境后音乐即时播放，点击 3D 情绪球或左右滑动也可切歌。
- **滑动切歌**：在情绪球上左右滑动即可"漂移"到下一首，带物理跟随反馈。
- **氛围着色**：AI 生成的标签会实时改变情绪球和背景粒子的颜色（如"happy"变暖金，"rain"变冷蓝），零信息压力的纯视觉沉浸。
- **交叉淡入淡出**：切歌时旧曲 400ms 淡出、新曲 600ms 淡入，避免硬切带来的断裂感。
- **双语界面**：内置中文和英文路由，默认入口跳转到 `/zh`。
- **动态视觉**：Three.js / React Three Fiber 渲染情绪球，Canvas 粒子背景随播放状态变速流动。
- **真实曲库 + 生成式音频**：优先从网易云音乐公开歌库匹配曲目，加载失败或超时则自动 fallback 到 Web Audio 生成式音频。
- **AI 氛围生成**：通过 Moonshot / Kimi API 为每首播放中的歌曲生成诗意标题、场景描述和氛围标签。
- **本地缓存**：氛围文案和策展结果均缓存 7 天，重复访问同 mood 秒开。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Three.js, `@react-three/fiber`
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

AI 功能需要配置 Moonshot API Key：

```bash
MOONSHOT_API_KEY=your_api_key_here
```

如果没有配置该变量，AI 生成接口会返回错误，但页面仍会继续工作：
- 策展按钮点击后回退到默认随机曲库
- 氛围文案显示歌曲名和艺术家作为兜底
- 音乐播放不受影响

## 常用脚本

```bash
yarn dev      # 启动开发服务器，端口 4548
yarn build    # 生成生产构建
yarn start    # 启动生产服务（需先 build）
yarn lint     # 运行 ESLint 检查
```

## Vercel 部署

1. 在 [Vercel](https://vercel.com) 导入项目
2. 在 **Environment Variables** 中添加 `MOONSHOT_API_KEY`
3. Framework Preset 选择 **Next.js**
4. 点击 Deploy

> 注意：网易云音乐播放 URL 在部分网络环境下可能不稳定，应用已内置超时检测、自动切歌和生成式音频 fallback 机制。

## 目录结构

```text
src/app
  page.tsx                       # 根路由，跳转到 /zh
  [locale]/                      # 多语言页面
  api/curate/                    # AI 策展接口（Kimi 选歌单）
  api/generate-atmosphere/       # AI 氛围文案接口（Kimi）
  api/netease/                   # 网易云代理接口（playlist / check / url）

src/components
  MoodControls.tsx               # 情绪与场景控制面板
  MoodOrb.tsx                    # 3D 情绪球（点击播放/暂停，滑动切歌）
  MoodBackground.tsx             # 背景氛围渐变
  BackgroundFlow.tsx             # Canvas 粒子背景
  MoodOutput.tsx                 # 氛围文案、标签、播放控制、AI 策展按钮

src/hooks
  useAtmosphere.ts               # 歌曲氛围文案请求
  useCurate.ts                   # AI 策展请求（mood -> playlistIds）
  useNeteasePlaylist.ts          # 网易云候选曲目管理

src/lib
  atmosphere-colors.ts           # 氛围标签到颜色的映射
  generative-audio.ts            # Web Audio 生成式音频引擎
  music-theory.ts                # 音阶和音乐理论工具
  netease.ts                     # 网易云 API 工具与歌单目录

src/stores
  useAppStore.ts                 # 应用状态（mood 参数）
  useAudioStore.ts               # 全局音频状态（播放/暂停/交叉淡入淡出）
  useAtmosphereColorStore.ts     # 氛围颜色状态（orb + 背景共享）

src/locales
  zh/common.json                 # 中文文案
  en/common.json                 # 英文文案
```

## 开发提示

- 根路径 `/` 会自动重定向到 `/zh`。
- 视觉和音频状态主要由 `useAppStore` 中的 mood 参数驱动。
- 网易云播放使用代理接口 `/api/netease/url` 获取真实签名 MP3 URL（20 分钟有效期）。
- 远程图片来源需要在 `next.config.ts` 的 `images.remotePatterns` 中声明。
