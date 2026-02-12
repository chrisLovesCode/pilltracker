/**
 * SlideToTrack Component
 * 
 * Swipeable button for tracking medication intake.
 * Requires deliberate slide action to prevent accidental tracking.
 */
import { Icon } from '@iconify/react';
import { useState, useRef, useEffect } from 'react';

interface SlideToTrackProps {
  onTrack: () => void;
  loading?: boolean;
  disabled?: boolean;
  label: string;
  testId?: string;
}

/**
 * Slide-to-track button with smooth animation and haptic feedback simulation
 */
export function SlideToTrack({ 
  onTrack, 
  loading = false, 
  disabled = false,
  label,
  testId = 'slide-to-track'
}: SlideToTrackProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [slidePosition, setSlidePosition] = useState(0);
  const [isTracked, setIsTracked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  
  const SLIDE_THRESHOLD = 0.85; // 85% slide required

  /**
   * Handle touch/mouse start
   */
  const handleStart = (_e: React.TouchEvent | React.MouseEvent) => {
    if (disabled || loading || isTracked) return;
    setIsDragging(true);
  };

  /**
   * Handle touch/mouse move
   */
  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current || !sliderRef.current) return;

    const container = containerRef.current;
    const slider = sliderRef.current;
    const containerWidth = container.offsetWidth;
    const sliderWidth = slider.offsetWidth;
    const maxSlide = containerWidth - sliderWidth;

    const containerRect = container.getBoundingClientRect();
    const relativeX = clientX - containerRect.left - sliderWidth / 2;
    
    const newPosition = Math.max(0, Math.min(relativeX, maxSlide));
    setSlidePosition(newPosition);

    // Check if threshold reached
    if (newPosition / maxSlide >= SLIDE_THRESHOLD) {
      handleTrack();
    }
  };

  /**
   * Handle touch/mouse end
   */
  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Reset if not tracked
    if (!isTracked) {
      setSlidePosition(0);
    }
  };

  /**
   * Handle successful track
   */
  const handleTrack = () => {
    if (isTracked || disabled || loading) return;
    
    setIsTracked(true);
    setIsDragging(false);
    
    // Visual feedback
    if (containerRef.current) {
      const container = containerRef.current;
      const maxSlide = container.offsetWidth - (sliderRef.current?.offsetWidth || 0);
      setSlidePosition(maxSlide);
    }
    
    // Trigger callback after animation
    setTimeout(() => {
      onTrack();
      // Reset after 1 second
      setTimeout(() => {
        setIsTracked(false);
        setSlidePosition(0);
      }, 1000);
    }, 200);
  };

  // Mouse event handlers
  const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  const progressPercentage = containerRef.current && sliderRef.current
    ? (slidePosition / (containerRef.current.offsetWidth - sliderRef.current.offsetWidth)) * 100
    : 0;

  return (
    <div 
      className={`
        relative w-full h-14 rounded-full overflow-hidden
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-grab'}
        ${isDragging ? 'cursor-grabbing' : ''}
      `}
      data-testid={testId}
      aria-label={testId}
      data-slide-position={slidePosition}
      ref={containerRef}
    >
      {/* Background Track */}
      <div className="absolute inset-0 bg-surface-3">
        {/* Progress Fill */}
        <div 
          className={`
            absolute inset-y-0 left-0 transition-colors duration-200
            ${isTracked ? 'bg-green-500' : 'bg-brand-color'}
          `}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={`
          text-track-label font-medium transition-opacity duration-200
          ${progressPercentage > 50 ? 'text-brand-on-solid' : 'text-text-muted'}
        `}>
          {loading ? 'Tracking...' : isTracked ? '✓ Tracked!' : label}
        </span>
      </div>

      {/* Slider Handle */}
      <div
        ref={sliderRef}
        className={`
          absolute top-1 bottom-1 left-1 w-12
          bg-surface-1 rounded-full shadow-lg
          flex items-center justify-center
          transition-transform duration-100
          ${!isDragging && !isTracked ? 'transition-all duration-300' : ''}
        `}
        style={{ 
          transform: `translateX(${slidePosition}px)`,
        }}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        data-testid={`${testId}-handle`}
        aria-label={`${testId}-handle`}
      >
        {loading ? (
          <Icon icon="mdi:loading" className="animate-spin text-brand-color text-xl" />
        ) : isTracked ? (
          <Icon icon="mdi:check" className="text-green-600 text-xl" />
        ) : (
          <Icon icon="mdi:chevron-right" className="text-brand-color text-xl" />
        )}
      </div>
    </div>
  );
}
