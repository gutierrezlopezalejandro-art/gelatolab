import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useT } from '../lib/i18n';
import { useEscapeKey } from '../lib/hooks';
import { searchHelp, suggestForRoute } from '../lib/helpSearch';
import { useAiStore } from '../store/aiStore';
import { askAssistantAI } from '../lib/ai';
import { track } from '../lib/analytics';
import { MarcoAvatar, MarcoHero } from './MarcoAvatar';
import { useHighlightStore } from '../lib/uiHighlight';
import {
  speak, stop, subscribeVoice, isVoiceEnabled, setVoiceEnabled,
  isVoiceSupported, ensureVoicesLoaded, langCodeForVoice, listAvailableVoices,
} from '../lib/voice';
import { useI18nStore } from '../lib/i18n';

/**
 * Asistente flotante con personaje Marco (heladero italiano). Tiene 4 vistas:
 *   - 'home'   — saludo + acciones rapidas (default al abrir)
 *   - 'guide'  — paso a paso de una tarea concreta
 *   - 'search' — busqueda en el centro de ayuda
 *   - 'chat'   — chat conversacional con IA (requiere clave OpenAI)
 */

// Categorias del asistente — agrupan las guias por concepto general,
// alineado con los menus principales de la app. Mantener el orden por
// frecuencia de uso del usuario.
function buildCategories(t) {
  return [
    { id: 'recipes',     emoji: '🍦', title: t('cat_recipes_title'),    sub: t('cat_recipes_sub') },
    { id: 'production',  emoji: '🏭', title: t('cat_production_title'), sub: t('cat_production_sub') },
    { id: 'inventory',   emoji: '📦', title: t('cat_inventory_title'),  sub: t('cat_inventory_sub') },
    { id: 'mobile',      emoji: '📱', title: t('cat_mobile_title'),     sub: t('cat_mobile_sub') },
    { id: 'compliance',  emoji: '🧪', title: t('cat_compliance_title'), sub: t('cat_compliance_sub') },
    { id: 'settings',    emoji: '⚙️', title: t('cat_settings_title'),   sub: t('cat_settings_sub') },
  ];
}

// Definicion de las guias paso-a-paso. Cada guia tiene un `goto` opcional
// (ruta a la que navegar para empezar) y pasos con highlights.
function buildGuides(t) {
  return [
    {
      id: 'create-recipe',
      categoryId: 'recipes',
      emoji: '📝',
      title: t('guide_recipe_title'),
      sub: t('guide_recipe_sub'),
      goto: '/recipes',
      gotoLabel: t('guide_recipe_goto'),
      highlightSelector: '[data-tour="recipe-new-btn"]',
      highlightMessage: t('guide_recipe_highlight'),
      steps: [
        {
          num: 1, emoji: '🍦',
          title: t('guide_recipe_s1_title'),
          body: t('guide_recipe_s1_body'),
        },
        {
          num: 2, emoji: '➕',
          title: t('guide_recipe_s2_title'),
          body: t('guide_recipe_s2_body'),
          highlightSelector: '[data-tour="nav-recipes"]',
          highlightMessage: t('guide_recipe_s2_highlight'),
        },
        {
          num: 3, emoji: '✏️',
          title: t('guide_recipe_s3_title'),
          body: t('guide_recipe_s3_body'),
          highlightSelector: '[data-tour="recipe-new-btn"]',
          highlightMessage: t('guide_recipe_s3_highlight'),
          options: [
            { emoji: '📄', label: t('guide_recipe_opt1_label'), desc: t('guide_recipe_opt1_desc') },
            { emoji: '✨', label: t('guide_recipe_opt2_label'), desc: t('guide_recipe_opt2_desc') },
            { emoji: '🪄', label: t('guide_recipe_opt3_label'), desc: t('guide_recipe_opt3_desc') },
          ],
        },
        {
          num: 4, emoji: '⚖️',
          title: t('guide_recipe_s4_title'),
          body: t('guide_recipe_s4_body'),
        },
      ],
    },
    {
      id: 'register-inventory',
      categoryId: 'inventory',
      emoji: '📦',
      title: t('guide_inv_title'),
      sub: t('guide_inv_sub'),
      goto: '/ingredients',
      gotoLabel: t('guide_inv_goto'),
      highlightSelector: '[data-tour="ingredients-search"]',
      highlightMessage: t('guide_inv_highlight'),
      steps: [
        { num: 1, emoji: '🥛', title: t('guide_inv_s1_title'), body: t('guide_inv_s1_body'),
          highlightSelector: '[data-tour="ingredients-search"]',
          highlightMessage: t('guide_inv_s1_highlight') },
        { num: 2, emoji: '🔘', title: t('guide_inv_s2_title'), body: t('guide_inv_s2_body') },
        { num: 3, emoji: '➕', title: t('guide_inv_s3_title'), body: t('guide_inv_s3_body') },
        { num: 4, emoji: '💰', title: t('guide_inv_s4_title'), body: t('guide_inv_s4_body') },
      ],
    },
    {
      id: 'generate-label',
      categoryId: 'production',
      emoji: '🏷️',
      title: t('guide_label_title'),
      sub: t('guide_label_sub'),
      goto: '/plan',
      gotoLabel: t('guide_label_goto'),
      steps: [
        { num: 1, emoji: '📅', title: t('guide_label_s1_title'), body: t('guide_label_s1_body'),
          highlightSelector: '[data-tour="nav-plan"]',
          highlightMessage: t('guide_label_s1_highlight') },
        { num: 2, emoji: '🍨', title: t('guide_label_s2_title'), body: t('guide_label_s2_body') },
        { num: 3, emoji: '🏷️', title: t('guide_label_s3_title'), body: t('guide_label_s3_body'),
          highlightSelector: '[data-tour="nav-production"]',
          highlightMessage: t('guide_label_s3_highlight') },
        { num: 4, emoji: '🖨️', title: t('guide_label_s4_title'), body: t('guide_label_s4_body') },
      ],
    },
    {
      id: 'plan-day',
      categoryId: 'production',
      emoji: '📅',
      title: t('guide_plan_title'),
      sub: t('guide_plan_sub'),
      goto: '/plan',
      gotoLabel: t('guide_plan_goto'),
      steps: [
        { num: 1, emoji: '📆', title: t('guide_plan_s1_title'), body: t('guide_plan_s1_body'),
          highlightSelector: '[data-tour="plan-date"]',
          highlightMessage: t('guide_plan_s1_highlight') },
        { num: 2, emoji: '➕', title: t('guide_plan_s2_title'), body: t('guide_plan_s2_body') },
        { num: 3, emoji: '🛒', title: t('guide_plan_s3_title'), body: t('guide_plan_s3_body') },
        { num: 4, emoji: '✅', title: t('guide_plan_s4_title'), body: t('guide_plan_s4_body') },
      ],
    },
    {
      id: 'backup-data',
      categoryId: 'settings',
      emoji: '💾',
      title: t('guide_backup_title'),
      sub: t('guide_backup_sub'),
      goto: null, // El backup se configura en el menu de usuario, no es una ruta
      steps: [
        { num: 1, emoji: '👤', title: t('guide_backup_s1_title'), body: t('guide_backup_s1_body'),
          highlightSelector: '[data-tour="user-menu"]',
          highlightMessage: t('guide_backup_s1_highlight') },
        { num: 2, emoji: '📁', title: t('guide_backup_s2_title'), body: t('guide_backup_s2_body') },
        { num: 3, emoji: '☁️', title: t('guide_backup_s3_title'), body: t('guide_backup_s3_body') },
        { num: 4, emoji: '📦', title: t('guide_backup_s4_title'), body: t('guide_backup_s4_body') },
      ],
    },
    {
      id: 'mobile-scanner',
      categoryId: 'mobile',
      emoji: '📱',
      title: t('guide_scanner_title'),
      sub: t('guide_scanner_sub'),
      goto: '/mobile',
      gotoLabel: t('guide_scanner_goto'),
      steps: [
        { num: 1, emoji: '🔗', title: t('guide_scanner_s1_title'), body: t('guide_scanner_s1_body') },
        { num: 2, emoji: '📷', title: t('guide_scanner_s2_title'), body: t('guide_scanner_s2_body') },
        { num: 3, emoji: '🔄', title: t('guide_scanner_s3_title'), body: t('guide_scanner_s3_body') },
        { num: 4, emoji: '✅', title: t('guide_scanner_s4_title'), body: t('guide_scanner_s4_body') },
      ],
    },
    {
      id: 'sub-recipes',
      categoryId: 'recipes',
      emoji: '🧱',
      title: t('guide_sub_title'),
      sub: t('guide_sub_sub'),
      goto: '/recipes',
      gotoLabel: t('guide_sub_goto'),
      steps: [
        { num: 1, emoji: '📝', title: t('guide_sub_s1_title'), body: t('guide_sub_s1_body') },
        { num: 2, emoji: '🏷️', title: t('guide_sub_s2_title'), body: t('guide_sub_s2_body'),
          highlightSelector: '[data-tour="recipe-subrecipe-toggle"]',
          highlightMessage: t('guide_sub_s2_highlight') },
        { num: 3, emoji: '🔗', title: t('guide_sub_s3_title'), body: t('guide_sub_s3_body') },
      ],
    },
    {
      id: 'compare-recipes',
      categoryId: 'recipes',
      emoji: '⚖️',
      title: t('guide_compare_title'),
      sub: t('guide_compare_sub'),
      goto: '/recipes',
      gotoLabel: t('guide_compare_goto'),
      steps: [
        { num: 1, emoji: '☑️', title: t('guide_compare_s1_title'), body: t('guide_compare_s1_body') },
        { num: 2, emoji: '⚖️', title: t('guide_compare_s2_title'), body: t('guide_compare_s2_body'),
          highlightSelector: '[data-tour="compare-btn"]',
          highlightMessage: t('guide_compare_s2_highlight') },
        { num: 3, emoji: '🟢', title: t('guide_compare_s3_title'), body: t('guide_compare_s3_body') },
      ],
    },
    {
      id: 'edit-recipe',
      categoryId: 'recipes',
      emoji: '✏️',
      title: t('guide_edit_title'),
      sub: t('guide_edit_sub'),
      goto: '/recipes',
      gotoLabel: t('guide_edit_goto'),
      steps: [
        { num: 1, emoji: '📋', title: t('guide_edit_s1_title'), body: t('guide_edit_s1_body') },
        { num: 2, emoji: '🏷️', title: t('guide_edit_s2_title'), body: t('guide_edit_s2_body'),
          highlightSelector: '[data-tour="recipe-header"]',
          highlightMessage: t('guide_edit_s2_highlight') },
        { num: 3, emoji: '📑', title: t('guide_edit_s3_title'), body: t('guide_edit_s3_body'),
          highlightSelector: '[data-tour="recipe-tabs"]',
          highlightMessage: t('guide_edit_s3_highlight'),
          options: [
            { emoji: '🧪', label: t('guide_edit_tab1_label'), desc: t('guide_edit_tab1_desc') },
            { emoji: '🔥', label: t('guide_edit_tab2_label'), desc: t('guide_edit_tab2_desc') },
            { emoji: '📈', label: t('guide_edit_tab3_label'), desc: t('guide_edit_tab3_desc') },
            { emoji: '🥗', label: t('guide_edit_tab4_label'), desc: t('guide_edit_tab4_desc') },
            { emoji: '🔍', label: t('guide_edit_tab5_label'), desc: t('guide_edit_tab5_desc') },
          ],
        },
        { num: 4, emoji: '⚖️', title: t('guide_edit_s4_title'), body: t('guide_edit_s4_body'),
          highlightSelector: '[data-tour="recipe-formulation"]',
          highlightMessage: t('guide_edit_s4_highlight') },
        { num: 5, emoji: '🎨', title: t('guide_edit_s5_title'), body: t('guide_edit_s5_body'),
          highlightSelector: '[data-tour="recipe-formulation"]',
          highlightMessage: t('guide_edit_s5_highlight') },
        { num: 6, emoji: '⚙️', title: t('guide_edit_s6_title'), body: t('guide_edit_s6_body'),
          highlightSelector: '[data-tour="recipe-balance-btn"]',
          highlightMessage: t('guide_edit_s6_highlight') },
        { num: 7, emoji: '💾', title: t('guide_edit_s7_title'), body: t('guide_edit_s7_body'),
          highlightSelector: '[data-tour="recipe-save-btn"]',
          highlightMessage: t('guide_edit_s7_highlight') },
      ],
    },
    {
      id: 'haccp-log',
      categoryId: 'compliance',
      emoji: '🧪',
      title: t('guide_haccp_title'),
      sub: t('guide_haccp_sub'),
      goto: '/haccp',
      gotoLabel: t('guide_haccp_goto'),
      highlightSelector: '[data-tour="haccp-form"]',
      highlightMessage: t('guide_haccp_highlight'),
      steps: [
        { num: 1, emoji: '🌡️', title: t('guide_haccp_s1_title'), body: t('guide_haccp_s1_body') },
        { num: 2, emoji: '✍️', title: t('guide_haccp_s2_title'), body: t('guide_haccp_s2_body') },
        { num: 3, emoji: '📊', title: t('guide_haccp_s3_title'), body: t('guide_haccp_s3_body') },
        { num: 4, emoji: '📥', title: t('guide_haccp_s4_title'), body: t('guide_haccp_s4_body') },
      ],
    },
    {
      id: 'configure-country',
      categoryId: 'settings',
      emoji: '🌎',
      title: t('guide_country_title'),
      sub: t('guide_country_sub'),
      goto: null,
      steps: [
        { num: 1, emoji: '🗺️', title: t('guide_country_s1_title'), body: t('guide_country_s1_body'),
          highlightSelector: '[data-tour="country-selector"]',
          highlightMessage: t('guide_country_s1_highlight') },
        { num: 2, emoji: '⚖️', title: t('guide_country_s2_title'), body: t('guide_country_s2_body'),
          options: [
            { emoji: '🇨🇱', label: t('guide_country_opt1_label'), desc: t('guide_country_opt1_desc') },
            { emoji: '🇧🇷', label: t('guide_country_opt2_label'), desc: t('guide_country_opt2_desc') },
            { emoji: '🇪🇺', label: t('guide_country_opt3_label'), desc: t('guide_country_opt3_desc') },
          ],
        },
        { num: 3, emoji: '🔄', title: t('guide_country_s3_title'), body: t('guide_country_s3_body') },
      ],
    },
    {
      id: 'ai-ingredient',
      categoryId: 'inventory',
      emoji: '✨',
      title: t('guide_aiing_title'),
      sub: t('guide_aiing_sub'),
      goto: '/ingredients',
      gotoLabel: t('guide_aiing_goto'),
      steps: [
        { num: 1, emoji: '🔑', title: t('guide_aiing_s1_title'), body: t('guide_aiing_s1_body'),
          highlightSelector: '[data-tour="user-menu"]',
          highlightMessage: t('guide_aiing_s1_highlight') },
        { num: 2, emoji: '➕', title: t('guide_aiing_s2_title'), body: t('guide_aiing_s2_body'),
          highlightSelector: '[data-tour="ingredient-add-btn"]',
          highlightMessage: t('guide_aiing_s2_highlight') },
        { num: 3, emoji: '🪄', title: t('guide_aiing_s3_title'), body: t('guide_aiing_s3_body') },
        { num: 4, emoji: '✅', title: t('guide_aiing_s4_title'), body: t('guide_aiing_s4_body') },
      ],
    },
    {
      id: 'process-sheet',
      categoryId: 'production',
      emoji: '📄',
      title: t('guide_sheet_title'),
      sub: t('guide_sheet_sub'),
      goto: '/production',
      gotoLabel: t('guide_sheet_goto'),
      steps: [
        { num: 1, emoji: '🏭', title: t('guide_sheet_s1_title'), body: t('guide_sheet_s1_body'),
          highlightSelector: '[data-tour="nav-production"]',
          highlightMessage: t('guide_sheet_s1_highlight') },
        { num: 2, emoji: '🖨️', title: t('guide_sheet_s2_title'), body: t('guide_sheet_s2_body') },
        { num: 3, emoji: '📋', title: t('guide_sheet_s3_title'), body: t('guide_sheet_s3_body') },
      ],
    },
    {
      id: 'business-data',
      categoryId: 'settings',
      emoji: '🏪',
      title: t('guide_biz_title'),
      sub: t('guide_biz_sub'),
      goto: null,
      steps: [
        { num: 1, emoji: '👤', title: t('guide_biz_s1_title'), body: t('guide_biz_s1_body'),
          highlightSelector: '[data-tour="user-menu"]',
          highlightMessage: t('guide_biz_s1_highlight') },
        { num: 2, emoji: '✏️', title: t('guide_biz_s2_title'), body: t('guide_biz_s2_body') },
        { num: 3, emoji: '🏷️', title: t('guide_biz_s3_title'), body: t('guide_biz_s3_body') },
        { num: 4, emoji: '🔒', title: t('guide_biz_s4_title'), body: t('guide_biz_s4_body') },
      ],
    },
  ];
}

function ChatBubble({ role, text, sources, id, onSpeak, isSpeaking, voiceEnabled, t }) {
  const isUser = role === 'user';
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {/* Avatar de Marco al costado izquierdo de cada respuesta del asistente. */}
      {!isUser && <MarcoAvatar size="sm" className="shrink-0" />}
      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed relative
        ${isUser
          ? 'bg-[var(--ink)] text-[var(--cream)] rounded-br-sm'
          : 'bg-[var(--cream2)]/70 text-[var(--ink)] rounded-bl-sm'}`}>
        <div className="whitespace-pre-wrap">{text}</div>
        {/* Boton de voz para los bubbles de Marco — aparece solo si la voz
            esta habilitada. Click reproduce o detiene segun estado. */}
        {!isUser && voiceEnabled && onSpeak && (
          <button
            onClick={() => onSpeak(text, id)}
            aria-label={isSpeaking ? t('voice_stop') : t('voice_play')}
            title={isSpeaking ? t('voice_stop') : t('voice_play')}
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none transition-colors"
          >
            <span aria-hidden="true">{isSpeaking ? '⏸️' : '🔊'}</span>
            <span>{isSpeaking ? t('voice_stop_short') : t('voice_play_short')}</span>
          </button>
        )}
        {sources && sources.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-black/10 text-[10px] text-[var(--ink3)]">
            <span className="font-semibold uppercase tracking-widest">Fuentes:</span>{' '}
            {sources.map((s, i) => (
              <span key={s.id}>
                <Link to={`/help#${s.id}`} className="text-[var(--mint)] hover:underline">{s.title}</Link>
                {i < sources.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleCard({ article, expanded, onToggle, t }) {
  const sub = article.intro?.length > 110
    ? article.intro.slice(0, 110) + '…'
    : article.intro;
  return (
    <div className="rounded-xl border border-black/10 bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 hover:bg-[var(--cream2)]/40 transition-colors cursor-pointer bg-transparent border-none"
      >
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0" aria-hidden="true">
            {(article.title.match(/^[\p{Emoji}]+/u) || ['📄'])[0]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-[var(--ink)] mb-0.5">
              {article.title.replace(/^[\p{Emoji}\s]+/u, '')}
            </div>
            <p className="text-xs text-[var(--ink3)] leading-relaxed">{sub}</p>
          </div>
          <span className="text-xs text-[var(--ink3)]">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-black/10 bg-[var(--cream2)]/30 text-sm text-[var(--ink2)] leading-relaxed">
          {article.intro && <p className="mb-2">{article.intro}</p>}
          {(article.sections || []).slice(0, 2).map((s, i) => (
            <div key={i} className="mb-2">
              {s.h && <h5 className="font-semibold text-[var(--ink)] mb-1">{s.h}</h5>}
              {s.p && <p className="mb-1.5">{s.p}</p>}
              {s.bullets && s.bullets.length > 0 && (
                <ul className="list-disc pl-5 space-y-1">
                  {s.bullets.slice(0, 4).map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              )}
            </div>
          ))}
          <Link to={`/help#${article.id}`} className="inline-block mt-2 text-xs font-semibold text-[var(--mint)] hover:underline">
            {t('assistant_read_full')} →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Vista Welcome ─────────────────────────────────────────────────────
function WelcomeView({ t, location, onPickCategory, onPickMode, onSpeak, isSpeakingGreeting, voiceEnabled }) {
  // Greeting segun hora del dia
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('marco_greet_morning')
                : hour < 19 ? t('marco_greet_afternoon')
                : t('marco_greet_evening');

  // Frase completa que Marco "dice" al hacer click en el boton de voz: el
  // saludo italiano + la intro en el idioma del usuario.
  const fullSpeech = `${greeting} ${t('marco_intro')}`;
  const categories = buildCategories(t);
  const guides = buildGuides(t);
  // Conteo de guias por categoria para mostrar al lado de cada cat.
  const countByCat = guides.reduce((acc, g) => {
    acc[g.categoryId] = (acc[g.categoryId] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero de Marco — la imagen completa de su heladeria */}
      <div className="relative">
        <MarcoHero />
        {/* Saludo superpuesto sobre la parte inferior de la imagen */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/75 via-black/35 to-transparent flex items-end justify-between gap-2">
          <div className="font-display text-xl text-white leading-tight drop-shadow-lg">
            {greeting} 👋
          </div>
          {voiceEnabled && onSpeak && (
            <button
              onClick={() => onSpeak(fullSpeech, 'welcome-greeting')}
              aria-label={isSpeakingGreeting ? t('voice_stop') : t('voice_play')}
              title={isSpeakingGreeting ? t('voice_stop') : t('voice_play')}
              className="shrink-0 w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-md flex items-center justify-center cursor-pointer border-none text-lg transition-transform hover:scale-105"
            >
              {isSpeakingGreeting ? '⏸️' : '🔊'}
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Intro de Marco — texto compacto */}
        <p className="text-xs text-[var(--ink2)] leading-relaxed mb-3">
          {t('marco_intro')}
        </p>

      {/* Pregunta */}
      <div className="bg-[var(--cream2)]/60 rounded-xl p-3 mb-3 border-l-4 border-[var(--gold)]">
        <p className="text-sm font-display text-[var(--ink)] mb-0.5">
          {t('marco_what_today')}
        </p>
        <p className="text-[11px] text-[var(--ink3)]">{t('marco_pick_one')}</p>
      </div>

      {/* Categorias */}
      <div className="space-y-1.5 mb-4">
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => onPickCategory(c.id)}
            className="w-full flex items-start gap-2.5 p-2.5 rounded-lg border border-black/5 bg-white hover:border-[var(--mint2)] hover:shadow-sm transition-all cursor-pointer text-left"
          >
            <span className="text-xl shrink-0" aria-hidden="true">{c.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs text-[var(--ink)] mb-0.5 flex items-center gap-1.5">
                <span>{c.title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--cream2)] text-[var(--ink3)]">
                  {countByCat[c.id] || 0}
                </span>
              </div>
              <p className="text-[11px] text-[var(--ink3)] leading-snug">{c.sub}</p>
            </div>
            <span className="text-[var(--ink3)] shrink-0 text-xs">→</span>
          </button>
        ))}
      </div>

      {/* Otras opciones */}
      <div className="border-t border-black/10 pt-3">
        <p className="text-[10px] uppercase tracking-widest text-[var(--ink3)] mb-1.5 font-semibold">
          {t('marco_other_options')}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onPickMode('search')}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-black/10 hover:border-[var(--mint2)] cursor-pointer transition-colors text-left"
          >
            <span className="text-sm" aria-hidden="true">🔍</span>
            <span className="text-[11px] font-semibold">{t('marco_search_anything')}</span>
          </button>
          <button
            onClick={() => onPickMode('chat')}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-black/10 hover:border-[var(--mint2)] cursor-pointer transition-colors text-left"
          >
            <span className="text-sm" aria-hidden="true">✨</span>
            <span className="text-[11px] font-semibold">{t('marco_chat_ai')}</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

// ── Vista Category (lista de guias dentro de una categoria) ──────────
function CategoryView({ category, guides, t, onPickGuide, onBack }) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Header con back y avatar */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} aria-label={t('guide_back')}
                className="text-lg text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">←</button>
        <MarcoAvatar size="sm" />
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base text-[var(--ink)] leading-tight">
            <span className="mr-1">{category.emoji}</span>{category.title}
          </h3>
          <p className="text-[11px] text-[var(--ink3)] leading-tight">{category.sub}</p>
        </div>
      </div>

      <p className="text-xs text-[var(--ink2)] mb-3">{t('cat_pick_topic', { count: guides.length })}</p>

      {/* Lista de guias dentro de la categoria */}
      <div className="space-y-1.5">
        {guides.map(g => (
          <button
            key={g.id}
            onClick={() => onPickGuide(g.id)}
            className="w-full flex items-start gap-2.5 p-2.5 rounded-lg border border-black/5 bg-white hover:border-[var(--mint2)] hover:shadow-sm transition-all cursor-pointer text-left"
          >
            <span className="text-xl shrink-0" aria-hidden="true">{g.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs text-[var(--ink)] mb-0.5">{g.title}</div>
              <p className="text-[11px] text-[var(--ink3)] leading-snug">{g.sub}</p>
            </div>
            <span className="text-[var(--ink3)] shrink-0 text-xs">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Vista Guide (paso a paso) ─────────────────────────────────────────
function GuideView({ guide, t, onBack, onClose, navigate, location }) {
  const [stepIdx, setStepIdx] = useState(0);
  const step = guide.steps[stepIdx];
  const isLast = stepIdx === guide.steps.length - 1;
  const onTargetRoute = location.pathname === guide.goto;

  function handleGoto() {
    track('guide_goto_clicked', { guide: guide.id });
    // Si la guia tiene un selector de highlight, lo programamos para que el
    // overlay lo muestre tras la navegacion. El timeout en setHighlight es
    // implicito — el overlay reintenta encontrar el elemento por 2s.
    if (guide.highlightSelector && guide.highlightMessage) {
      useHighlightStore.getState().setHighlight(
        guide.highlightSelector,
        guide.highlightMessage
      );
    }
    if (guide.goto) navigate(guide.goto);
    onClose();
  }

  // Cuando el usuario hace click en "Ver en pantalla" en un paso especifico,
  // se dispara el highlight del selector del paso. Funciona si el usuario ya
  // esta en la pantalla correcta (el overlay reintenta por 2s).
  function handleStepHighlight() {
    if (!step.highlightSelector) return;
    track('step_highlight_clicked', { guide: guide.id, step: step.num });
    useHighlightStore.getState().setHighlight(
      step.highlightSelector,
      step.highlightMessage || step.body
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Header con back y avatar small */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} aria-label={t('guide_back')}
                className="text-lg text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">←</button>
        <MarcoAvatar size="sm" />
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base text-[var(--ink)] leading-tight">
            <span className="mr-1">{guide.emoji}</span>{guide.title}
          </h3>
          <p className="text-[11px] text-[var(--ink3)] leading-tight">{guide.sub}</p>
        </div>
      </div>

      {/* Indicador de pasos */}
      <div className="flex gap-1 mb-4">
        {guide.steps.map((_, i) => (
          <div key={i}
               className="flex-1 h-1.5 rounded-full transition-colors"
               style={{ background: i <= stepIdx ? 'var(--gold)' : 'var(--cream2)' }} />
        ))}
      </div>

      {/* Step content */}
      <div className="bg-[var(--cream2)]/40 rounded-xl p-4 mb-3">
        <div className="flex items-baseline gap-2.5 mb-2">
          <span className="text-2xl" aria-hidden="true">{step.emoji}</span>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-[var(--ink3)] mb-0.5">
              {t('guide_step')} {step.num} / {guide.steps.length}
            </div>
            <h4 className="font-display text-base text-[var(--ink)] leading-tight">{step.title}</h4>
          </div>
        </div>
        <p className="text-xs text-[var(--ink2)] leading-relaxed mb-3">{step.body}</p>

        {/* Boton "Ver en pantalla". Mostrar si el paso tiene selector Y
            (el usuario esta en la ruta destino, O la guia no tiene ruta
            destino — para highlights de elementos globales del navbar como
            country-selector, user-menu, etc.). */}
        {step.highlightSelector && (onTargetRoute || !guide.goto) && (
          <button
            onClick={handleStepHighlight}
            className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8b920] text-[var(--ink)] text-xs font-bold cursor-pointer border-none hover:opacity-90 transition-opacity"
          >
            <span aria-hidden="true">👆</span>
            {t('guide_show_on_screen')}
          </button>
        )}

        {/* Si el paso tiene highlight pero el usuario NO esta en la pantalla,
            mostrar un hint para que clickee el goto del header. */}
        {step.highlightSelector && !onTargetRoute && guide.goto && (
          <p className="mb-3 text-[10px] text-[var(--ink3)] italic">
            💡 {t('guide_navigate_first', { route: guide.gotoLabel || guide.goto })}
          </p>
        )}

        {/* Opciones inline si el step las tiene */}
        {step.options && step.options.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {step.options.map((o, i) => (
              <div key={i} className="bg-white rounded-lg p-2.5 border border-black/10 flex items-start gap-2.5">
                <span className="text-lg shrink-0" aria-hidden="true">{o.emoji}</span>
                <div>
                  <div className="font-semibold text-xs text-[var(--ink)] mb-0.5">{o.label}</div>
                  <p className="text-[11px] text-[var(--ink2)] leading-snug">{o.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="space-y-2">
        {/* CTA principal: ir a la pantalla del guide */}
        {guide.goto && !onTargetRoute && (
          <button onClick={handleGoto}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[var(--ink)] text-[var(--cream)] text-sm font-bold cursor-pointer border-none hover:opacity-90 transition-opacity">
            <span aria-hidden="true">↗</span>
            {guide.gotoLabel}
          </button>
        )}
        {onTargetRoute && (
          <div className="text-center text-xs text-[var(--mint)] font-semibold py-1">
            ✓ {t('guide_already_here')}
          </div>
        )}

        {/* Navegacion entre pasos */}
        <div className="flex justify-between gap-2">
          <button
            onClick={() => setStepIdx(i => Math.max(0, i - 1))}
            disabled={stepIdx === 0}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-black/10 hover:bg-black/5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            ← {t('guide_prev_step')}
          </button>
          {!isLast ? (
            <button onClick={() => setStepIdx(i => i + 1)}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-[#e8b920] text-[var(--ink)] hover:opacity-90 cursor-pointer border-none">
              {t('guide_next_step')} →
            </button>
          ) : (
            <button onClick={onBack}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-[var(--mint)] text-white hover:opacity-90 cursor-pointer border-none">
              ✓ {t('guide_finish')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────
export function HelpAssistant() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const lang = useI18nStore(s => s.lang);
  const voiceLang = langCodeForVoice(lang);

  const [open, setOpen] = useState(false);
  // Vistas: 'home' (categorias) | 'category' (guias de una cat) | 'guide' (paso a paso) | 'search' | 'chat'
  const [view, setView] = useState('home');
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [activeGuideId, setActiveGuideId] = useState(null);
  // Lado del drawer: por default a la derecha, cambia automaticamente al
  // izquierdo si el elemento resaltado por Marco esta en la mitad derecha
  // de la pantalla (para no taparlo).
  const [drawerSide, setDrawerSide] = useState('right');
  const pendingHighlight = useHighlightStore(s => s.pending);

  // Estado de voz: enabled persiste en localStorage; speakingId rastrea cual
  // bubble del chat (o saludo del welcome) esta hablando ahora mismo.
  const [voiceEnabled, setVoiceEnabledState] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const voiceSupported = isVoiceSupported();

  useEffect(() => {
    setVoiceEnabledState(isVoiceEnabled());
    ensureVoicesLoaded();
    // Expone helper de debug para que el usuario pueda inspeccionar voces
    // desde la consola: window.__listVoices()
    if (typeof window !== 'undefined') {
      window.__listVoices = () => {
        const voices = listAvailableVoices();
        console.table(voices);
        return voices;
      };
    }
  }, []);

  useEffect(() => {
    return subscribeVoice((event, data) => {
      if (event === 'start') setSpeakingId(data.id);
      else setSpeakingId(null);
    });
  }, []);

  // Cuando el usuario cierra el drawer, paramos cualquier voz en curso.
  useEffect(() => {
    if (!open) stop();
  }, [open]);

  // Detecta si el highlight pending coincide con la posicion del drawer y,
  // si es asi, lo mueve al lado opuesto para que el elemento sea visible.
  // Reintenta con un pequeno delay para que el rect del elemento ya este
  // calculado tras la navegacion.
  useEffect(() => {
    if (!pendingHighlight) {
      // Sin highlight activo: vuelve a la posicion default (derecha).
      setDrawerSide('right');
      return;
    }
    const tid = setTimeout(() => {
      const el = document.querySelector(pendingHighlight.selector);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const drawerWidth = 360;
      const vpw = window.innerWidth;
      // Si el elemento esta en la mitad derecha (su centro pasa el medio),
      // el drawer va a la izquierda. Sino se queda a la derecha.
      const elCenterX = rect.left + rect.width / 2;
      if (elCenterX > vpw / 2) {
        setDrawerSide('left');
      } else {
        setDrawerSide('right');
      }
    }, 100);
    return () => clearTimeout(tid);
  }, [pendingHighlight]);

  function toggleVoice() {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    setVoiceEnabledState(next);
    track('voice_toggled', { enabled: next });
    if (!next) {
      stop(); // si lo apagas mientras habla, lo callas
    } else {
      // Frase de prueba: confirma que la voz funciona y le da feedback al
      // usuario inmediatamente. Force=true para que se reproduzca sin esperar
      // al re-render donde voiceEnabled ya este true en estado.
      setTimeout(() => {
        speak(t('voice_test_phrase'), { lang: voiceLang, id: 'voice-test', force: true });
      }, 50);
    }
  }

  function speakOrStop(text, id) {
    if (speakingId === id) {
      stop();
    } else {
      speak(text, { lang: voiceLang, id });
    }
  }

  // Estado para el modo search
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  // Estado para el modo chat
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const chatScrollRef = useRef(null);
  const aiKey = useAiStore(s => s.apiKey);
  const aiAvailable = !!aiKey;

  useEscapeKey(() => {
    // Escape: navegacion progresiva hacia atras hasta llegar al home, ahi
    // cierra el drawer.
    if (view === 'guide') backFromGuide();
    else if (view !== 'home') backToHome();
    else setOpen(false);
  }, open);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let cancelled = false;
    searchHelp(query, 8).then(r => { if (!cancelled) setResults(r); });
    return () => { cancelled = true; };
  }, [query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    suggestForRoute(location.pathname, 4).then(s => { if (!cancelled) setSuggestions(s); });
    return () => { cancelled = true; };
  }, [location.pathname, open]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chat, chatBusy]);

  function handleOpen() {
    setOpen(true);
    setView('home'); // siempre arrancar en home
    track('assistant_opened', { route: location.pathname });
  }

  function pickCategory(id) {
    setActiveCategoryId(id);
    setView('category');
    track('category_picked', { category: id, route: location.pathname });
  }

  function pickGuide(id) {
    setActiveGuideId(id);
    setView('guide');
    track('guide_started', { guide: id, route: location.pathname });
  }

  function pickMode(m) {
    setView(m);
    track('assistant_mode_picked', { mode: m });
  }

  function backToHome() {
    setView('home');
    setActiveCategoryId(null);
    setActiveGuideId(null);
  }

  // Back inteligente: desde una guia volvemos a su categoria si vinimos de
  // ahi; sino al home.
  function backFromGuide() {
    if (activeCategoryId) {
      setView('category');
      setActiveGuideId(null);
    } else {
      backToHome();
    }
  }

  async function handleAsk(e) {
    e.preventDefault();
    const q = chatInput.trim();
    if (!q || chatBusy) return;
    setChat(prev => [...prev, { role: 'user', text: q }]);
    setChatInput('');
    setChatBusy(true);
    track('assistant_question_asked', { route: location.pathname });
    try {
      const { answer, sources } = await askAssistantAI({
        question: q, currentRoute: location.pathname,
      });
      setChat(prev => [...prev, { role: 'assistant', text: answer, sources }]);
    } catch (err) {
      const msg = String(err?.message || err);
      setChat(prev => [...prev, {
        role: 'assistant',
        text: msg.includes('AI_KEY_MISSING') ? t('assistant_no_key_msg') : t('assistant_error_msg'),
      }]);
    } finally { setChatBusy(false); }
  }

  const guides = buildGuides(t);
  const categories = buildCategories(t);
  const activeGuide = guides.find(g => g.id === activeGuideId);
  const activeCategory = categories.find(c => c.id === activeCategoryId);
  const guidesInCategory = activeCategoryId
    ? guides.filter(g => g.categoryId === activeCategoryId)
    : [];

  return (
    <>
      {!open && (
        <button
          onClick={handleOpen}
          aria-label={t('assistant_open')}
          className="fixed bottom-5 right-5 z-[200] w-16 h-16 rounded-full shadow-2xl
                     cursor-pointer border-none bg-white hover:scale-105 transition-transform p-1"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.20)' }}
        >
          <MarcoAvatar size="md" talking animated />
        </button>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog" aria-modal="true" aria-labelledby="assistant-title"
            className={`fixed top-0 z-[500] h-full w-full md:w-[360px] bg-white shadow-2xl flex flex-col ${
              drawerSide === 'left' ? 'left-0' : 'right-0'
            }`}
          >
            {/* Header */}
            <div className="px-5 py-3 border-b border-black/10 bg-gradient-to-br from-[var(--cream)] to-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                {view !== 'home' && (
                  <button
                    onClick={() => {
                      if (view === 'guide') backFromGuide();
                      else backToHome();
                    }}
                    aria-label={t('guide_back')}
                    className="text-xl text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">
                    ←
                  </button>
                )}
                <h2 id="assistant-title" className="font-display text-lg text-[var(--ink)]">
                  {view === 'home' ? t('assistant_title_marco') :
                   view === 'category' ? t('assistant_title_category') :
                   view === 'guide' ? t('assistant_title_guide') :
                   view === 'search' ? t('assistant_title_search') :
                   t('assistant_title_chat')}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {voiceSupported && (
                  <button
                    onClick={toggleVoice}
                    aria-label={voiceEnabled ? t('voice_disable') : t('voice_enable')}
                    title={voiceEnabled ? t('voice_disable') : t('voice_enable')}
                    className="text-base px-2 py-1 rounded hover:bg-black/5 cursor-pointer bg-transparent border-none transition-colors"
                  >
                    {voiceEnabled ? '🔊' : '🔇'}
                  </button>
                )}
                <button onClick={() => setOpen(false)} aria-label={t('close')}
                        className="text-2xl text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">
                  ×
                </button>
              </div>
            </div>

            {/* Vistas */}
            {view === 'home' && (
              <WelcomeView
                t={t} location={location}
                onPickCategory={pickCategory}
                onPickMode={pickMode}
                onSpeak={speakOrStop}
                isSpeakingGreeting={speakingId === 'welcome-greeting'}
                voiceEnabled={voiceEnabled}
              />
            )}

            {view === 'category' && activeCategory && (
              <CategoryView
                category={activeCategory}
                guides={guidesInCategory}
                t={t}
                onPickGuide={pickGuide}
                onBack={backToHome}
              />
            )}

            {view === 'guide' && activeGuide && (
              <GuideView
                guide={activeGuide} t={t}
                onBack={backFromGuide}
                onClose={() => setOpen(false)}
                navigate={navigate}
                location={location}
              />
            )}

            {view === 'search' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <input
                  type="text" autoFocus
                  placeholder={t('assistant_search_placeholder')}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setExpandedId(null); }}
                  className="w-full px-4 py-2.5 rounded-lg border border-black/15 bg-white text-base focus:outline-none focus:border-[var(--mint2)]"
                />
                {query && (
                  <p className="text-xs text-[var(--ink3)] -mt-2">
                    {results.length > 0
                      ? t('assistant_results_count', { count: results.length })
                      : t('assistant_no_results')}
                  </p>
                )}
                {!query && suggestions.length > 0 && (
                  <div>
                    <h3 className="text-[10px] uppercase tracking-widest text-[var(--ink3)] mb-2 font-semibold">
                      {t('assistant_suggested_for_route')}
                    </h3>
                    <div className="space-y-2">
                      {suggestions.map(a => (
                        <ArticleCard key={a.id} article={a}
                                     expanded={expandedId === a.id}
                                     onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
                                     t={t} />
                      ))}
                    </div>
                  </div>
                )}
                {query && results.length > 0 && (
                  <div className="space-y-2">
                    {results.map(a => (
                      <ArticleCard key={a.id} article={a}
                                   expanded={expandedId === a.id}
                                   onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
                                   t={t} />
                    ))}
                  </div>
                )}
                {query && results.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2" aria-hidden="true">🤔</div>
                    <p className="text-sm text-[var(--ink2)] mb-4">{t('assistant_no_results_hint')}</p>
                    {aiAvailable && (
                      <button onClick={() => { pickMode('chat'); setChatInput(query); }}
                              className="text-sm font-semibold text-[var(--mint)] hover:underline cursor-pointer bg-transparent border-none">
                        ✨ {t('assistant_ask_ai')} →
                      </button>
                    )}
                  </div>
                )}
                <div className="pt-4 border-t border-black/5">
                  <Link to="/help" onClick={() => setOpen(false)}
                        className="text-sm text-[var(--mint)] hover:underline font-semibold">
                    📖 {t('assistant_browse_full_help')} →
                  </Link>
                </div>
              </div>
            )}

            {view === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {!aiAvailable ? (
                  <div className="flex-1 p-5 flex flex-col items-center justify-center text-center">
                    <div className="text-5xl mb-4" aria-hidden="true">🔑</div>
                    <h3 className="font-display text-xl mb-2">{t('assistant_no_key_title')}</h3>
                    <p className="text-sm text-[var(--ink2)] mb-5 max-w-xs">{t('assistant_no_key_body')}</p>
                    <button onClick={() => pickMode('search')}
                            className="text-sm font-semibold text-[var(--mint)] hover:underline cursor-pointer bg-transparent border-none">
                      🔍 {t('assistant_use_search_instead')} →
                    </button>
                  </div>
                ) : (
                  <>
                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-5 py-4">
                      {chat.length === 0 && (
                        <div className="text-center py-6">
                          <MarcoAvatar size="md" talking className="mb-3" />
                          <h3 className="font-display text-lg mb-1">{t('assistant_chat_welcome_title')}</h3>
                          <p className="text-sm text-[var(--ink3)] mb-5">{t('assistant_chat_welcome_body')}</p>
                          <div className="space-y-1.5 max-w-xs mx-auto">
                            <SampleQ q={t('assistant_sample_q1')} onAsk={(s) => setChatInput(s)} />
                            <SampleQ q={t('assistant_sample_q2')} onAsk={(s) => setChatInput(s)} />
                            <SampleQ q={t('assistant_sample_q3')} onAsk={(s) => setChatInput(s)} />
                          </div>
                        </div>
                      )}
                      {chat.map((msg, i) => (
                        <ChatBubble
                          key={i} role={msg.role} text={msg.text} sources={msg.sources}
                          id={`chat-${i}`}
                          onSpeak={speakOrStop}
                          isSpeaking={speakingId === `chat-${i}`}
                          voiceEnabled={voiceEnabled}
                          t={t}
                        />
                      ))}
                      {chatBusy && (
                        <div className="flex justify-start mb-3">
                          <div className="bg-[var(--cream2)]/70 text-[var(--ink3)] px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-sm italic">
                            {t('assistant_thinking')}…
                          </div>
                        </div>
                      )}
                    </div>
                    <form onSubmit={handleAsk} className="border-t border-black/10 bg-white p-3">
                      <div className="flex gap-2">
                        <input type="text" value={chatInput}
                               onChange={e => setChatInput(e.target.value)}
                               placeholder={t('assistant_chat_placeholder')}
                               disabled={chatBusy}
                               className="flex-1 px-3.5 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:border-[var(--mint2)] disabled:opacity-50" />
                        <button type="submit" disabled={!chatInput.trim() || chatBusy}
                                className="px-4 py-2 rounded-lg bg-[var(--ink)] text-[var(--cream)] text-sm font-bold cursor-pointer border-none hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                          ↑
                        </button>
                      </div>
                      {chat.length > 0 && (
                        <button type="button" onClick={() => setChat([])}
                                className="text-[10px] text-[var(--ink3)] hover:text-[var(--ink)] mt-1.5 cursor-pointer bg-transparent border-none">
                          {t('assistant_clear_chat')}
                        </button>
                      )}
                    </form>
                  </>
                )}
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}

function SampleQ({ q, onAsk }) {
  return (
    <button
      onClick={() => onAsk(q)}
      className="block w-full text-left px-3 py-2 rounded-lg bg-[var(--cream2)]/50 hover:bg-[var(--cream2)] text-xs text-[var(--ink2)] cursor-pointer border border-black/5">
      💡 {q}
    </button>
  );
}
