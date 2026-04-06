import React from 'react';
import { motion } from 'framer-motion';

export type SkeletonVariant = 'text' | 'circle' | 'rectangle' | 'table-row';
export type SkeletonAnimation = 'pulse' | 'shimmer' | 'wave';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  animation?: SkeletonAnimation;
  className?: string;
  rounded?: string | number;
  style?: React.CSSProperties;
}

const animationVariants = {
  pulse: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
  shimmer: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear' as const,
    },
  },
  wave: {
    opacity: [0.3, 0.7, 0.3],
    x: [-20, 20, -20],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = 'shimmer',
  className = '',
  rounded,
}) => {
  const baseStyles: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? 14 : undefined),
    borderRadius: rounded || (variant === 'circle' ? '50%' : variant === 'text' ? 4 : 8),
    background: variant === 'text' || variant === 'table-row'
      ? 'linear-gradient(90deg, var(--c-surface-raised) 25%, var(--c-border) 50%, var(--c-surface-raised) 75%)'
      : 'var(--c-surface-raised)',
    backgroundSize: animation === 'shimmer' ? '200% 100%' : '100% 100%',
  };

  const specificStyles: Record<SkeletonVariant, React.CSSProperties> = {
    text: {
      height: 14,
      marginBottom: 8,
    },
    circle: {
      width: width || 40,
      height: height || 40,
      borderRadius: '50%',
    },
    rectangle: {
      borderRadius: 8,
    },
    'table-row': {
      height: 48,
      marginBottom: 0,
    },
  };

  const style: React.CSSProperties = {
    ...baseStyles,
    ...specificStyles[variant],
    ...(width ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
  };

  return (
    <motion.div
      className={`flex-shrink-0 ${className}`}
      style={style}
      animate={animationVariants[animation]}
    />
  );
};

interface SkeletonTextProps {
  lines?: number;
  width?: string | number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  width,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        width={i === lines - 1 && width ? width : undefined}
        style={{
          width: i === lines - 1 && !width ? '60%' : width ? (typeof width === 'number' ? `${width}px` : width) : '100%',
        }}
      />
    ))}
  </div>
);

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const avatarSizes = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 'md',
  className = '',
}) => (
  <Skeleton
    variant="circle"
    width={avatarSizes[size]}
    height={avatarSizes[size]}
    className={className}
  />
);

interface SkeletonCardProps {
  showImage?: boolean;
  lines?: number;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showImage = true,
  lines = 3,
  className = '',
}) => (
  <div 
    className={`p-4 rounded-xl border border-[var(--c-border)] ${className}`}
    style={{ background: 'var(--c-surface)' }}
  >
    {showImage && (
      <Skeleton variant="rectangle" height={120} className="mb-4" />
    )}
    <Skeleton variant="text" width="70%" height={18} className="mb-2" />
    <SkeletonText lines={lines} />
  </div>
);

interface SkeletonTableProps {
  columns: number;
  rows?: number;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  columns,
  rows = 5,
  className = '',
}) => (
  <div 
    className={`overflow-hidden rounded-xl border border-[var(--c-border)] ${className}`}
    style={{ background: 'var(--c-surface)' }}
  >
    <div 
      className="flex"
      style={{ 
        borderBottom: '1px solid var(--c-border)',
        background: 'var(--c-surface-raised)',
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className="flex-1 p-3"
        >
          <Skeleton variant="text" width={i === columns - 1 ? '40%' : '80%'} />
        </div>
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={rowIndex}
        className={`flex ${rowIndex % 2 === 1 ? 'bg-[var(--c-surface-raised)]/30' : ''}`}
        style={{ borderBottom: '1px solid var(--c-border-subtle)' }}
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div
            key={colIndex}
            className="flex-1 p-3"
          >
            <Skeleton 
              variant="text" 
              width={colIndex === columns - 1 ? '30%' : '70%'} 
              animation={rowIndex % 2 === 0 ? 'shimmer' : 'pulse'}
            />
          </div>
        ))}
      </div>
    ))}
  </div>
);

interface SkeletonButtonProps {
  width?: string | number;
  className?: string;
}

export const SkeletonButton: React.FC<SkeletonButtonProps> = ({
  width,
  className = '',
}) => (
  <Skeleton
    variant="rectangle"
    width={width || 100}
    height={36}
    rounded={8}
    className={className}
  />
);

interface SkeletonInputProps {
  className?: string;
}

export const SkeletonInput: React.FC<SkeletonInputProps> = ({
  className = '',
}) => (
  <div className={`space-y-1 ${className}`}>
    <Skeleton variant="text" width={80} height={12} />
    <Skeleton variant="rectangle" height={40} rounded={8} />
  </div>
);

export default Skeleton;
