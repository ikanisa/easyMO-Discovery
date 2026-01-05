
import React from 'react';
import { cn } from '../../utils/ui';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  className,
  ...props
}) => {
  const baseStyle = 'animate-pulse bg-slate-200 dark:bg-slate-700/50';
  
  const variants = {
    text: 'rounded-full',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-2xl',
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'circular' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : variant === 'circular' ? '100%' : '1rem'),
    aspectRatio: variant === 'circular' ? '1 / 1' : undefined,
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseStyle, variants.text)}
            style={{
              ...style,
              width: i === lines - 1 ? '75%' : '100%',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseStyle, variants[variant], className)}
      style={style}
      {...props}
    />
  );
};

export default Skeleton;

