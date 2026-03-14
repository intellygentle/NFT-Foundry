/**
 * components/ui.tsx
 *
 * All shared UI primitives in one file to keep imports clean.
 * Every component uses the CSS variables defined in globals.css.
 */

import React, { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

// ── Button ─────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-mono font-medium transition-all duration-150 rounded select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/50',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-5 py-2 text-sm',
        size === 'lg' && 'px-7 py-3 text-base',
        variant === 'primary' && [
          'bg-amber text-black',
          'hover:bg-amber-dim active:scale-[0.98]',
          'shadow-[0_0_0_0_rgba(245,158,11,0)]',
          'hover:shadow-[0_0_16px_rgba(245,158,11,0.25)]',
        ],
        variant === 'secondary' && [
          'bg-surface-2 text-text border border-border',
          'hover:border-amber-dim hover:text-amber',
        ],
        variant === 'ghost' && [
          'text-dim hover:text-text hover:bg-surface-2',
        ],
        variant === 'danger' && [
          'bg-red-900/30 text-red-400 border border-red-900/50',
          'hover:bg-red-900/50',
        ],
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin flex-shrink-0" />}
      {children}
    </button>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  suffix?: string;
}

export function Input({ label, hint, error, suffix, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-mono uppercase tracking-widest text-dim">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={clsx(
            'w-full bg-surface-2 border rounded px-3 py-2 text-sm font-mono text-text',
            'placeholder:text-muted',
            'focus:outline-none focus:border-amber-dim focus:bg-surface',
            'transition-colors duration-150',
            error ? 'border-red-500/60' : 'border-border',
            suffix && 'pr-12',
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">
            {suffix}
          </span>
        )}
      </div>
      {hint && !error && <p className="text-xs text-muted font-mono">{hint}</p>}
      {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
    </div>
  );
}

// ── Textarea ───────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-mono uppercase tracking-widest text-dim">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          'w-full bg-surface-2 border rounded px-3 py-2 text-sm font-mono text-text',
          'placeholder:text-muted resize-none',
          'focus:outline-none focus:border-amber-dim focus:bg-surface',
          'transition-colors duration-150',
          error ? 'border-red-500/60' : 'border-border',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-muted font-mono">{hint}</p>}
      {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  className?: string;
  bracket?: boolean; // adds corner bracket accent
}

export function Card({ children, className, bracket }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-surface border border-border rounded-lg p-5',
        bracket && 'bracket-tl bracket-tr',
        className
      )}
    >
      {children}
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: ReactNode;
  variant?: 'amber' | 'green' | 'red' | 'blue' | 'default';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 text-xs font-mono rounded uppercase tracking-wide',
        variant === 'amber' && 'bg-amber-glow text-amber border border-amber-dim/30',
        variant === 'green' && 'bg-green-500/10 text-green-400 border border-green-500/20',
        variant === 'red' && 'bg-red-500/10 text-red-400 border border-red-500/20',
        variant === 'blue' && 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
        variant === 'default' && 'bg-surface-2 text-dim border border-border',
        className
      )}
    >
      {children}
    </span>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-border my-4" />;
  return (
    <div className="flex items-center gap-3 my-4">
      <hr className="flex-1 border-border" />
      <span className="text-xs font-mono text-muted uppercase tracking-widest">{label}</span>
      <hr className="flex-1 border-border" />
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────
interface StepProps {
  steps: string[];
  current: number; // 0-indexed
}

export function StepIndicator({ steps, current }: StepProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={clsx(
                'w-6 h-6 rounded-sm flex items-center justify-center text-xs font-mono font-bold',
                i < current && 'bg-amber text-black',
                i === current && 'bg-amber-glow border border-amber text-amber',
                i > current && 'bg-surface-2 border border-border text-muted'
              )}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span
              className={clsx(
                'text-xs font-mono uppercase tracking-wide hidden sm:block',
                i === current ? 'text-text' : 'text-muted'
              )}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={clsx(
                'h-px w-8 mx-2',
                i < current ? 'bg-amber' : 'bg-border'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Result box (tx hash, address, URI) ────────────────────────────────────
interface ResultBoxProps {
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
}

export function ResultBox({ label, value, href, mono = true }: ResultBoxProps) {
  const content = (
    <div className="flex flex-col gap-1 p-3 bg-surface-2 border border-border rounded">
      <span className="text-xs font-mono text-muted uppercase tracking-widest">{label}</span>
      <span
        className={clsx(
          'text-sm break-all',
          mono && 'font-mono',
          href && 'text-amber hover:underline cursor-pointer'
        )}
      >
        {value}
      </span>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return content;
}

// ── Section header ─────────────────────────────────────────────────────────
export function SectionHeader({
  step,
  title,
  subtitle,
}: {
  step?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-4 mb-5">
      {step && (
        <div className="flex-shrink-0 w-8 h-8 border border-amber flex items-center justify-center">
          <span className="text-amber font-mono text-sm font-bold">{step}</span>
        </div>
      )}
      <div>
        <h2 className="font-display text-2xl text-text">{title}</h2>
        {subtitle && <p className="text-sm text-dim mt-0.5 font-body">{subtitle}</p>}
      </div>
    </div>
  );
}