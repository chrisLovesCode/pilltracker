/**
 * Button Component
 * 
 * Reusable button with variants (primary, secondary, danger) and sizes.
 * Supports loading state and disabled state.
 */
import { Icon } from '@iconify/react';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconClassName?: string;
  loading?: boolean;
  children?: ReactNode;
}

/**
 * Button component with multiple variants and icon support
 */
export function Button({ 
  variant = 'primary', 
  size = 'md',
  icon,
  iconClassName = '',
  loading = false,
  children,
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  const testId = (props as any)['data-testid'] as string | undefined;
  const ariaLabel = (props as any)['aria-label'] as string | undefined;
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold rounded-control transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-brand-color hover:bg-brand-color-strong text-brand-on-solid shadow-sm hover:shadow-md',
    secondary: 'bg-surface-3 hover:bg-surface-4 text-text-primary',
    danger: 'bg-red-600 hover:bg-red-700 text-text-inverse',
    ghost: 'hover:bg-surface-2 text-text-secondary',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      // Help Android UIAutomator find elements inside WebView via content-desc.
      aria-label={ariaLabel ?? testId}
      {...props}
    >
      {loading ? (
        <Icon icon="mdi:loading" className="animate-spin text-xl" />
      ) : icon ? (
        <Icon icon={icon} className={`text-xl ${iconClassName}`.trim()} />
      ) : null}
      {children}
    </button>
  );
}
