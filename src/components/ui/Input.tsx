/**
 * Input Component
 * 
 * Reusable input field with label, error state, and icon support.
 */
import { Icon } from '@iconify/react';
import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string;
}

/**
 * Input field with optional label, icon, and error message
 */
export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  const testId = (props as any)['data-testid'] as string | undefined;
  const id = props.id ?? testId;
  const ariaLabel = (props as any)['aria-label'] as string | undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Icon icon={icon} className="text-gray-400 text-xl" />
          </div>
        )}
        <input
          className={`
            w-full px-4 py-2 border rounded-lg transition-colors
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'}
            focus:outline-none focus:ring-2
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${className}
          `}
          id={id}
          // Help Android UIAutomator find elements inside WebView via content-desc.
          aria-label={ariaLabel ?? testId ?? label}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
