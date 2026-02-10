/**
 * Card Component
 * 
 * Container component with consistent styling for content sections.
 */
import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Card container with shadow and rounded corners
 */
export function Card({ children, className = '', onClick, ...props }: CardProps) {
  return (
    <div 
      className={`
        bg-white rounded-lg shadow-md p-4
        ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
