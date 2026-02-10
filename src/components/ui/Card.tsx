/**
 * Card Component
 * 
 * Container component with consistent styling for content sections.
 */
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Card container with shadow and rounded corners
 */
export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div 
      className={`
        bg-white rounded-lg shadow-md p-4
        ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
