/**
 * MiniDev ONE Template - UI Components Index
 * 
 * Reusable UI components.
 */

import { createElement } from 'react';

// =============================================================================
// BUTTON
// =============================================================================
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-primary text-white hover:opacity-90 focus:ring-primary',
    secondary: 'bg-muted text-foreground hover:bg-border focus:ring-border',
    ghost: 'bg-transparent text-foreground hover:bg-muted focus:ring-border',
    danger: 'bg-error text-white hover:opacity-90 focus:ring-error',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// =============================================================================
// INPUT
// =============================================================================
interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url';
  disabled?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  error,
  hint,
  required = false,
  className = '',
}: InputProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`w-full px-4 py-2 rounded-lg border bg-background transition-colors
          focus:outline-none focus:ring-2 focus:ring-offset-0
          ${error ? 'border-error focus:ring-error' : 'border-border focus:ring-ring'}
          disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      {error && <p className="text-sm text-error">{error}</p>}
      {hint && !error && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

// =============================================================================
// TEXTAREA
// =============================================================================
interface TextareaProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function Textarea({
  label,
  placeholder,
  value,
  onChange,
  rows = 4,
  disabled = false,
  error,
  className = '',
}: TextareaProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-sm font-medium">{label}</label>}
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full px-4 py-2 rounded-lg border bg-background transition-colors
          focus:outline-none focus:ring-2 focus:ring-offset-0 resize-none
          ${error ? 'border-error focus:ring-error' : 'border-border focus:ring-ring'}
          disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}

// =============================================================================
// SELECT
// =============================================================================
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  error,
  className = '',
}: SelectProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-sm font-medium">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={`w-full px-4 py-2 rounded-lg border bg-background transition-colors
          focus:outline-none focus:ring-2 focus:ring-offset-0
          ${error ? 'border-error focus:ring-error' : 'border-border focus:ring-ring'}
          disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}

// =============================================================================
// CARD
// =============================================================================
interface CardProps {
  children: React.ReactNode;
  padding?: boolean;
  hover?: boolean;
  className?: string;
}

export function Card({ children, padding = true, hover = false, className = '' }: CardProps) {
  return (
    <div className={`bg-card border border-border rounded-xl ${padding ? 'p-4' : ''} ${hover ? 'hover:shadow-lg hover:border-primary transition-all cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  );
}

// =============================================================================
// BADGE
// =============================================================================
type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variantStyles = {
    default: 'bg-muted text-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
    outline: 'border border-border text-foreground',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}

// =============================================================================
// AVATAR
// =============================================================================
interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ src, name = '', size = 'md', className = '' }: AvatarProps) {
  const sizeStyles = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={`relative rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-medium overflow-hidden ${sizeStyles[size]} ${className}`}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials || '?'
      )}
    </div>
  );
}

// =============================================================================
// MODAL
// =============================================================================
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlay?: boolean;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', closeOnOverlay = true }: ModalProps) {
  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={closeOnOverlay ? onClose : undefined} />
      <div className={`relative w-full ${sizeStyles[size]} bg-card rounded-xl shadow-2xl max-h-[90vh] overflow-auto`}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-lg font-bold">{title}</h3>
            <button onClick={onClose} className="text-muted hover:text-foreground text-xl">×</button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// =============================================================================
// TABS
// =============================================================================
interface Tab {
  id: string;
  label: string;
  icon?: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, defaultTab, onChange, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleChange = (id: string) => {
    setActiveTab(id);
    onChange?.(id);
  };

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div className={className}>
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors -mb-px
              ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="py-4">{activeContent}</div>
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  className?: string;
}

export function Skeleton({ width, height = '1rem', rounded = false, className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-muted animate-pulse ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
      style={{ width, height }}
    />
  );
}

// =============================================================================
// EXPORTS
// =============================================================================
export default {
  Button,
  Input,
  Textarea,
  Select,
  Card,
  Badge,
  Avatar,
  Modal,
  Tabs,
  Skeleton,
};

function useState<T>(initial: T): [T, (value: T) => void] {
  const [value, setValue] = (window as any).__useState?.(initial) || [initial, () => {}];
  return [value, setValue];
}
