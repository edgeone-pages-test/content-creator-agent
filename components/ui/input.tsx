import React, { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suggestion?: string;
  suggestionHint?: string;
  onAcceptSuggestion?: () => void;
}

export function Input({ className, label, id, suggestion, suggestionHint, onAcceptSuggestion, onKeyDown, onFocus, ...props }: InputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && suggestion && onAcceptSuggestion && !props.value) {
      e.preventDefault();
      onAcceptSuggestion();
    }
    onKeyDown?.(e);
  }, [suggestion, onAcceptSuggestion, onKeyDown, props.value]);

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          className={cn(
            'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500',
            className
          )}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          {...props}
          placeholder={suggestion && !props.value ? '' : props.placeholder}
        />
        {/* Ghost text suggestion overlay */}
        {suggestion && !props.value && (
          <div className="pointer-events-none absolute inset-0 flex items-center px-3">
            <span className="text-sm text-gray-300 dark:text-gray-600 truncate">
              {suggestion}
            </span>
          </div>
        )}
        {/* Hint badge */}
        {suggestion && !props.value && suggestionHint && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="inline-flex items-center gap-1 rounded bg-brand-50 dark:bg-brand-900/30 px-1.5 py-0.5 text-[10px] font-medium text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
              <kbd className="font-mono text-[9px] bg-white dark:bg-gray-800 rounded px-0.5 border border-gray-200 dark:border-gray-700">Tab</kbd>
              {suggestionHint}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
