/**
 * Notion Button Component
 * Notion-style button with variants
 * AC-001: Visual Style
 */
import React from 'react';

interface NotionButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
}

export const NotionButton: React.FC<NotionButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  style,
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 6,
    border: '1px solid transparent',
    fontWeight: 500,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '4px 8px', fontSize: 12 },
    md: { padding: '6px 12px', fontSize: 14 },
    lg: { padding: '8px 16px', fontSize: 14 },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#3b82f6',
      color: '#fff',
      borderColor: '#3b82f6',
    },
    secondary: {
      backgroundColor: '#f7f6f3',
      color: '#37352f',
      borderColor: '#e3e2e0',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#6b6b6b',
      borderColor: 'transparent',
    },
    danger: {
      backgroundColor: '#ef4444',
      color: '#fff',
      borderColor: '#ef4444',
    },
  };

  const hoverStyles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: '#2563eb' },
    secondary: { backgroundColor: '#ebebea' },
    ghost: { backgroundColor: '#f7f6f3' },
    danger: { backgroundColor: '#dc2626' },
  };

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };

  return (
    <button
      type={type}
      className={`notion-btn notion-btn-${variant} ${className}`}
      style={combinedStyles}
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, hoverStyles[variant]);
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, variantStyles[variant]);
        }
      }}
    >
      {loading && (
        <span className="notion-btn-spinner" style={{ marginRight: 4 }}>
          ⟳
        </span>
      )}
      {icon && <span className="notion-btn-icon">{icon}</span>}
      {children}
    </button>
  );
};
