# Moodrift

Moodrift 是一个基于情绪和场景生成音乐氛围的沉浸式 Web 应用。它不是传统播放器——用户通过调节能量、环境、活动和情绪参数进入某种状态，页面会实时生成对应的氛围标题、描述、BPM、标签、动态视觉背景，并自动播放匹配的音乐。

## 功能概览

- **情绪控制**：通过能量滑杆，以及环境、活动、情绪选项组合生成氛围。
- **单屏沉浸式交互**：所有操作在一屏内完成，切换环境后音乐自动播放，点击 3D 情绪球也可播放/暂停。
- **双语界面**：内置中文和英文路由，默认入口会跳转到 `/zh`。
- **动态视觉**：使用 Three.js / React Three Fiber 渲染情绪球，Canvas 粒子背景随播放状态变化。
- **真实曲库 + 生成式音频**：优先从网易云音乐公开歌库匹配曲目，若加载失败或超时则自动 fallback 到 Web Audio 生成式音频，保证始终有声音。
- **AI 氛围生成**：通过 Moonshot / Kimi API 生成标题、描述、标签和 BPM。
- **本地兜底数据**：AI 不可用时自动使用本地 preset 继续展示结果。

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

AI 生成功能需要配置 Moonshot API Key：

```bash
MOONSHOT_API_KEY=your_api_key_here
```

如果没有配置该变量，AI 生成接口会返回错误，但页面仍会使用本地生成的氛围数据继续工作，音乐播放不受影响。

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

> 注意：网易云音乐播放 URL 在部分网络环境下可能不稳定，应用已内置超时检测和自动切歌机制，并会自动 fallback 到生成式音频。

## 目录结构

```text
src/app
  page.tsx                       # 根路由，跳转到 /zh
  [locale]/                      # 多语言页面
  api/generate-atmosphere/       # AI 氛围生成接口（Kimi）
  api/netease/playlist/          # 网易云歌单代理接口

src/components
  MoodControls.tsx               # 情绪与场景控制面板
  MoodOrb.tsx                    # 3D 情绪球（可点击播放/暂停）
  MoodBackground.tsx             # 背景氛围
  BackgroundFlow.tsx             # Canvas 粒子背景
  MoodOutput.tsx                 # 氛围结果、标签、播放控制

src/hooks
  useAtmosphere.ts               # AI 氛围请求
  useNeteasePlaylist.ts          # 网易云候选曲目管理

src/lib
  moods.ts                       # 本地氛围生成逻辑
  generative-audio.ts            # Web Audio 生成式音频引擎
  music-theory.ts                # 音阶和音乐理论工具
  netease.ts                     # 网易云 API 工具

src/stores
  useAppStore.ts                 # 应用状态（mood 参数）
  useAudioStore.ts               # 全局音频状态（播放/暂停/进度）

src/locales
  zh/common.json                 # 中文文案
  en/common.json                 # 英文文案
```

## 开发提示

- 根路径 `/` 会自动重定向到 `/zh`。
- 视觉和音频状态主要由 `useAppStore` 中的 mood 参数驱动。
- 网易云播放使用 `music.163.com/song/media/outer/url?id={id}.mp3`，无需设置 `crossOrigin`，但部分歌曲可能因版权或地域限制无法播放。
- 远程图片来源需要在 `next.config.ts` 的 `images.remotePatterns` 中声明。
