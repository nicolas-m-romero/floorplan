// frontend/src/components/ui/Input.tsx
import React from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  mono?: boolean;
}

export function Input({
  label,
  error,
  hint,
  mono = false,
  id,
  className = '',
  ...rest
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`input-field ${error ? 'input-field--error' : ''} ${className}`}>
      {label ? (
        <label className="input-field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`input ${mono ? 'input--mono' : ''}`}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        {...rest}
      />
      {error ? (
        <span id={`${inputId}-error`} className="input-field__error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="input-field__hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
