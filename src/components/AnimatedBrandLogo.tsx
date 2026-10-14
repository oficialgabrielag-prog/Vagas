import React from 'react';

interface AnimatedBrandLogoProps {
  mode?: 'periodic' | 'active';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  textColor?: string;
  goldColor?: string;
  className?: string;
}

export const AnimatedBrandLogo: React.FC<AnimatedBrandLogoProps> = ({
  mode = 'periodic',
  size = 'md',
  textColor = '#0F4C9C',
  goldColor = '#FFC20E',
  className = ''
}) => {
  const letters = [
    { char: 'C', color: textColor, delay: '0.0s' },
    { char: 'u', color: textColor, delay: '0.12s' },
    { char: 'n', color: textColor, delay: '0.24s' },
    { char: 'e', color: textColor, delay: '0.36s' },
    { char: 'n', color: textColor, delay: '0.48s' },
    { char: 'e', color: textColor, delay: '0.60s' },
    { char: 'V', color: goldColor, delay: '0.72s' },
    { char: 'a', color: goldColor, delay: '0.84s' },
    { char: 'g', color: goldColor, delay: '0.96s' },
    { char: 'a', color: goldColor, delay: '1.08s' },
    { char: 's', color: goldColor, delay: '1.20s' },
  ];

  const sizeClasses = {
    sm: 'text-sm font-bold',
    md: 'text-xl font-bold',
    lg: 'text-2xl font-black',
    xl: 'text-3xl font-black'
  };

  const animClass = mode === 'periodic' ? 'anim-jump-20s' : 'anim-jump-active';

  return (
    <span className={`inline-flex items-center select-none tracking-tight ${sizeClasses[size]} ${className}`}>
      {letters.map((item, idx) => (
        <span
          key={idx}
          className={`inline-block ${animClass}`}
          style={{
            color: item.color,
            animationDelay: item.delay
          }}
        >
          {item.char}
        </span>
      ))}
    </span>
  );
};
