'use client';

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore, type Environment, type Activity, type Emotion } from '@/stores/useAppStore';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const environments: Environment[] = ['rain', 'city', 'mountain', 'night', 'sunset'];
const activities: Activity[] = ['run', 'walk', 'focus', 'work', 'drive'];
const emotions: Emotion[] = ['lonely', 'dreamy', 'happy', 'melancholy'];

export function MoodControls() {
  const { t } = useTranslation('common');
  const { energy, environment, activity, emotion, setEnergy, setEnvironment, setActivity, setEmotion } = useAppStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
      className="w-full max-w-xl mx-auto px-6 mb-10"
    >
      <div className="space-y-6">
        {/* Energy Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs tracking-widest uppercase text-muted-foreground">
            <span>{t('controls.energy')}</span>
            <span className="tabular-nums">{energy}%</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{t('controls.calm')}</span>
            <Slider
              value={[energy]}
              onValueChange={(v) => setEnergy(Array.isArray(v) ? v[0] : v)}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{t('controls.intense')}</span>
          </div>
        </div>

        {/* Environment Tabs */}
        <ControlGroup label={t('controls.environment')}>
          <Tabs value={environment} onValueChange={(v) => setEnvironment(v as Environment)}>
            <TabsList className="bg-transparent p-0 gap-1 flex-wrap h-auto">
              {environments.map((env) => (
                <TabsTrigger
                  key={env}
                  value={env}
                  className="text-xs tracking-wide px-3 py-1.5 rounded-full data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none border border-transparent data-[state=active]:border-primary/20 transition-all duration-300"
                >
                  {t(`environments.${env}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </ControlGroup>

        {/* Activity Tabs */}
        <ControlGroup label={t('controls.activity')}>
          <Tabs value={activity} onValueChange={(v) => setActivity(v as Activity)}>
            <TabsList className="bg-transparent p-0 gap-1 flex-wrap h-auto">
              {activities.map((act) => (
                <TabsTrigger
                  key={act}
                  value={act}
                  className="text-xs tracking-wide px-3 py-1.5 rounded-full data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none border border-transparent data-[state=active]:border-primary/20 transition-all duration-300"
                >
                  {t(`activities.${act}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </ControlGroup>

        {/* Emotion Tabs */}
        <ControlGroup label={t('controls.emotion')}>
          <Tabs value={emotion} onValueChange={(v) => setEmotion(v as Emotion)}>
            <TabsList className="bg-transparent p-0 gap-1 flex-wrap h-auto">
              {emotions.map((emo) => (
                <TabsTrigger
                  key={emo}
                  value={emo}
                  className="text-xs tracking-wide px-3 py-1.5 rounded-full data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none border border-transparent data-[state=active]:border-primary/20 transition-all duration-300"
                >
                  {t(`emotions.${emo}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </ControlGroup>
      </div>
    </motion.div>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="text-xs tracking-widest uppercase text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
