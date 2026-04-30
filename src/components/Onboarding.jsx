import { useState, useEffect } from 'react';
import { useT } from '../lib/i18n';
import { Logo } from './Logo';

const STORAGE_KEY = 'gelatolab-onboarded';

export function Onboarding() {
  const t = useT();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  }

  if (!show) return null;

  const steps = [
    {
      title: t('onb_welcome_title'),
      desc: t('onb_welcome_desc'),
      icon: <Logo size={72} variant="light" />,
    },
    {
      title: t('onb_recipes_title'),
      desc: t('onb_recipes_desc'),
      icon: <span className="text-5xl" aria-hidden="true">📋</span>,
    },
    {
      title: t('onb_analysis_title'),
      desc: t('onb_analysis_desc'),
      icon: <span className="text-5xl" aria-hidden="true">📊</span>,
    },
    {
      title: t('onb_batch_title'),
      desc: t('onb_batch_desc'),
      icon: <span className="text-5xl" aria-hidden="true">⚖️</span>,
    },
    {
      title: t('onb_ready_title'),
      desc: t('onb_ready_desc'),
      icon: <span className="text-5xl" aria-hidden="true">🎉</span>,
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onb-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-8 text-center">
          <div className="mb-4 flex justify-center">{current.icon}</div>
          <h2 id="onb-title" className="font-display text-2xl text-[var(--ink)] mb-3">
            {current.title}
          </h2>
          <p className="text-sm text-[var(--ink2)] leading-relaxed mb-6">
            {current.desc}
          </p>

          {/* Step indicator */}
          <div className="flex justify-center gap-1.5 mb-6" role="tablist" aria-label="Progreso">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === step ? 'w-8 bg-[var(--mint)]' : 'w-2 bg-[var(--cream3)]'
                }`}
                aria-current={i === step ? 'step' : undefined}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-between items-center">
            <button
              onClick={finish}
              className="text-xs text-[var(--ink3)] hover:text-[var(--ink)] bg-transparent border-none cursor-pointer underline"
            >
              {t('onb_skip')}
            </button>
            <div className="flex gap-2">
              {step > 0 && (
                <button className="btn-secondary" onClick={() => setStep(step - 1)}>
                  {t('onb_back')}
                </button>
              )}
              {isLast ? (
                <button className="btn-primary" onClick={finish}>
                  {t('onb_start')}
                </button>
              ) : (
                <button className="btn-primary" onClick={() => setStep(step + 1)}>
                  {t('onb_next')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
