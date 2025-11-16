import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import logoImage from '../assets/logo/logo_transparent_1.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  animated?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  showText = true, 
  animated = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
  };

  const textSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const LogoContent = (
    <motion.div
      animate={animated ? { rotate: 360 } : {}}
      transition={animated ? { duration: 20, repeat: Infinity, ease: 'linear' } : {}}
      className={`relative ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 blur-xl rounded-full"></div>
      <img 
        src={logoImage} 
        alt="Data Analyzer Pro Logo" 
        className={`${sizeClasses[size]} relative z-10 object-contain drop-shadow-lg`}
        style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.3))' }}
      />
    </motion.div>
  );

  if (showText) {
    return (
      <div className="flex items-center gap-3">
        <Link to="/">
          {LogoContent}
        </Link>
        <span className={`${textSizeClasses[size]} font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent`}>
          <Link to="/">Data Analyzer Pro</Link>
        </span>
      </div>
    );
  }

  return (
    <Link to="/">
      {LogoContent}
    </Link>
  );
};

export default Logo;

