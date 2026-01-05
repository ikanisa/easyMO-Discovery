
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'danger';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'base' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  icon,
  size = 'base',
  ...props 
}) => {
  // Base styles: tap target >= 44px, haptic feedback, focus ring
  const baseStyle = `
    relative overflow-hidden font-medium rounded-xl
    transition-all duration-200
    active:scale-[0.98] 
    disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center justify-center gap-2
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    min-h-tap
    touch-manipulation
  `.trim().replace(/\s+/g, ' ');
  
  // Size variants
  const sizeStyles = {
    sm: 'py-2 px-4 text-sm min-h-[44px]',
    base: 'py-3.5 px-6 text-base min-h-[44px]',
    lg: 'py-4 px-8 text-lg min-h-tap-lg',
  };
  
  // Color variants
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white shadow-lg",
    glass: "bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md shadow-glass",
    danger: "bg-red-500/80 hover:bg-red-500 text-white shadow-lg shadow-red-500/30"
  };

  return (
    <button 
      className={`${baseStyle} ${sizeStyles[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {icon && <span className="w-5 h-5 flex items-center justify-center" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
