import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'danger';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  icon,
  ...props 
}) => {
  const baseStyle = "relative overflow-hidden font-medium rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 py-3.5 px-6 shadow-lg";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white",
    glass: "bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md",
    danger: "bg-red-500/80 hover:bg-red-500 text-white"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {icon && <span className="w-5 h-5">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
