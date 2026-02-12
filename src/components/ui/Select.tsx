/**
 * Select Component
 * 
 * Reusable select dropdown with label and error state.
 */
import { SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

/**
 * Select dropdown with optional label and error message
 */
export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  const testId = (props as any)['data-testid'] as string | undefined;
  const id = props.id ?? testId;
  const ariaLabel = (props as any)['aria-label'] as string | undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-content-muted font-medium text-text-secondary mb-1">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-4 py-2 border rounded-control transition-colors appearance-none bg-surface-1 text-content
          ${error ? 'border-red-500 focus:ring-red-500' : 'border-border-default focus:ring-brand-focus'}
          focus:outline-none focus:ring-2
          disabled:bg-surface-2 disabled:cursor-not-allowed
          ${className}
        `}
        id={id}
        aria-label={ariaLabel ?? testId ?? label}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-content-muted text-red-600">{error}</p>
      )}
    </div>
  );
}
