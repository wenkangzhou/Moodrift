# Moodrift

Moodrift 是一个基于情绪和场景生成音乐氛围的沉浸式 Web 应用。打开即用——点击情绪球开始播放，滑动切歌，AI 会为当前歌曲生成氛围文案与标签，视觉背景会随氛围实时变化。

## 功能概览

- **零控制沉浸**：无需调节参数，应用自动从精选曲库中挑选曲目并生成氛围。
- **AI 音乐策展**：点击「AI 策展」，Kimi 会从曲库目录中挑选最匹配的歌单，重新组池并切换。
- **单屏交互**：所有操作在一屏内完成，点击情绪球播放/暂停，左右滑动切歌。
- **氛围着色**：AI 生成的标签会实时改变情绪球和背景粒子的颜色（如「happy」变暖金，「rain」变冷蓝）。
- **交叉淡入淡出**：切歌时旧曲淡出、新曲淡入，避免硬切带来的断裂感。
- **双语界面**：内置中文和英文路由，默认入口跳转到 `/zh`。
- **无障碍支持**：尊重 `prefers-reduced-motion` 设置，减少动画与粒子运动。
- **动态视觉**：CSS 情绪球 + Canvas 粒子背景，随播放状态变速流动。
- **真实曲库 + 生成式音频**：优先从网易云音乐公开歌库匹配曲目，加载失败或超时自动 fallback 到 Web Audio 生成式音频。
- **AI 氛围生成**：通过 Moonshot / Kimi API 为每首播放中的歌曲生成诗意标题、场景描述和氛围标签。
- **本地缓存**：氛围文案和策展结果均缓存 7 天，重复访问秒开。
- **PWA 离线可用**：Service Worker 缓存静态资源，二次访问可离线加载核心体验。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Zustand
- i18next, react-i18next

## 本地运行

安装依赖：

```bash
npm install
# 或 yarn install
```

启动开发服务：

```bash
npm run dev
# 或 yarn dev
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
npm run dev      # 启动开发服务器，端口 4548
npm run build    # 生成生产构建
npm run start    # 启动生产服务（需先 build）
npm run lint     # 运行 ESLint 检查
```

## Vercel 部署

1. 在 [Vercel](https://vercel.com) 导入 GitHub 仓库
2. 在 **Environment Variables** 中添加 `MOONSHOT_API_KEY`
3. Framework Preset 选择 **Next.js**
4. 提交并推送代码，Vercel 会自动触发部署

> 注意：网易云音乐播放 URL 在部分网络环境下可能不稳定，应用已内置超时检测、自动切歌和生成式音频 fallback 机制。

## 目录结构

```text
src/app
  page.tsx                       # 根路由，跳转到 /zh
  [locale]/                      # 多语言页面
  [locale]/error.tsx             # 本地化错误边界
  api/curate/                    # AI 策展接口（Kimi 选歌单）
  api/generate-atmosphere/       # AI 氛围文案接口（Kimi）
  api/netease/                   # 网易云代理接口（playlist / check / url）

src/components
  MoodOrb.tsx                    # 情绪球（点击播放/暂停，滑动切歌）
  MoodBackground.tsx             # 背景氛围渐变
  BackgroundFlow.tsx             # Canvas 粒子背景
  MoodOutput.tsx                 # 氛围文案、标签、播放控制、AI 策展按钮

src/hooks
  useAtmosphere.ts               # 歌曲氛围文案请求
  useCurate.ts                   # AI 策展请求
  useSongPool.ts                 # 网易云候选曲目管理
  useReducedMotion.ts            # 检测并响应 reduced-motion 偏好

src/lib
  atmosphere-colors.ts           # 氛围标签到颜色的映射
  generative-audio.ts            # Web Audio 生成式音频引擎
  logger.ts                      # 开发环境日志封装
  music-theory.ts                # 音阶和音乐理论工具
  netease.ts                     # 网易云 API 工具与歌单目录
  server-cache.ts                # 服务端 AI 响应缓存

src/stores
  useAudioStore.ts               # 全局音频状态（播放/暂停/进度/交叉淡入淡出）
  useAtmosphereColorStore.ts     # 氛围颜色状态（orb + 背景共享）

src/locales
  zh/common.json                 # 中文文案
  en/common.json                 # 英文文案
```

## 开发提示

- 根路径 `/` 会自动重定向到 `/zh`。
- 视觉和音频状态主要由 `useAudioStore` 驱动。
- 网易云播放使用代理接口 `/api/netease/url` 获取真实签名 MP3 URL（20 分钟有效期）。
- 远程图片来源需要在 `next.config.ts` 的 `images.remotePatterns` 中声明。
- 新增客户端日志请使用 `src/lib/logger.ts`，避免生产环境输出噪声。
