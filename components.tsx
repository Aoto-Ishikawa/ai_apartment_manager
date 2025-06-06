

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileSystemItem, FileType, SummaryResult, User, BreadcrumbItem, AccessLevel, AIChatMessage } from './types';
import { 
    CommonStyles, Icons, ThemeColors, I18N_KEYS, SUMMARIZABLE_MIME_TYPES,
    SPREADSHEET_MIME_TYPES, PRESENTATION_MIME_TYPES, AUDIO_MIME_TYPES_PREFIX, VIDEO_MIME_TYPES_PREFIX
} from './constants';
import { useTranslation } from './LanguageContext';

// Markdownレンダリングユーティリティ
export const renderInlineMarkdownToHTML = (markdown: string): string => {
  if (!markdown) return '';
  let html = markdown;
  // 太字 (**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // 太字 (__)
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // 斜体 (*word*) - リストマーカーに注意
  // ** の一部ではなく、スペースが後に続かない * に一致します (潜在的なリストマーカー)
  html = html.replace(/(?<!\*)\*(?!\s|\*)([^*]+)\*(?!\*)/g, '<em>$1</em>');
  // 斜体 (_word_)
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  return html;
};

export const renderMarkdownToHTML = (markdown: string): string => {
  if (!markdown) return '';

  // まず、テキスト全体のインラインマークダウンを処理します
  let html = renderInlineMarkdownToHTML(markdown);

  // リスト（ブロック要素）を処理します
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inList = false;

  for (const line of lines) {
    // "* " または "- " で始まる行に一致させます（リストアイテム）
    const listItemMatch = line.match(/^(\s*)(?:[\*\-])\s+(.*)/);
    if (listItemMatch) {
      const indent = listItemMatch[1]; // 将来的な使用（ネストされたリスト）のためにキャプチャされます
      const content = listItemMatch[2]; // コンテンツにはすでにインラインマークダウンが含まれています
      if (!inList) {
        processedLines.push(`${indent}<ul>`);
        inList = true;
      }
      processedLines.push(`${indent}  <li>${content}</li>`);
    } else {
      if (inList) {
        // 適切に閉じるために <ul> タグのインデントを決定します
        const ulIndent = processedLines.find(l => l.includes("<ul>"))?.match(/^(\s*)/)?.[1] || "";
        processedLines.push(`${ulIndent}</ul>`);
        inList = false;
      }
      processedLines.push(line);
    }
  }
  if (inList) { // マークダウンがリストアイテムで終わる場合
    const ulIndent = processedLines.find(l => l.includes("<ul>"))?.match(/^(\s*)/)?.[1] || "";
    processedLines.push(`${ulIndent}</ul>`);
  }

  html = processedLines.join('\n');

  // 残りの改行を <br /> に変換します
  // これはリスト構造が形成された後に行われるべきです。
  html = html.replace(/\n/g, '<br />');

  // リストタグの周囲に不適切に配置された可能性のある <br /> タグをクリーンアップします
  html = html.replace(/<br \/>(\s*<\/?(ul|li)>)/g, '$1');
  html = html.replace(/(<\/(ul|li)>\s*)<br \/>/g, '$1');
  // リスト処理から形成された可能性のある空の段落の <br /> をクリーンアップします
  html = html.replace(/<p><br \/><\/p>/g, '');


  return html;
};


// 一般的なUIコンポーネント
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon' | 'danger';
  isLoading?: boolean;
  iconLeft?: React.ReactElement;
  iconRight?: React.ReactElement;
  srText?: string; // アイコンボタン用のスクリーンリーダーテキスト
  as?: 'button' | 'a'; // 異なる要素としてのレンダリングを許可
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  isLoading = false, 
  children, 
  iconLeft, 
  iconRight, 
  className, 
  srText, 
  as = 'button', 
  ...props 
}) => {
  const { t } = useTranslation();
  let baseClasses = '';
  switch (variant) {
    case 'primary': baseClasses = CommonStyles.buttonPrimary; break;
    case 'secondary': baseClasses = CommonStyles.buttonSecondary; break;
    case 'icon': baseClasses = CommonStyles.buttonIcon; break;
    case 'danger': baseClasses = `px-6 py-3 ${ThemeColors.error} ${ThemeColors.onError} rounded-full shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-all duration-200 ease-in-out text-sm font-medium flex items-center justify-center gap-2`; break;
  }
  const iconOnly = !children && (iconLeft || iconRight);

  const buttonContent = (
    <>
      {isLoading ? <Icons.spinner className="w-5 h-5" /> : iconLeft}
      {children && <span className={`${iconLeft && children ? "ml-2" : ""} ${iconRight && children ? "mr-2" : ""}`}>{children}</span>}
      {!isLoading && iconRight}
    </>
  );
  
  const commonProps = {
    className: `${baseClasses} ${className || ''} disabled:opacity-50 disabled:cursor-not-allowed`,
    'aria-label': srText || (iconOnly && typeof children === 'string' ? children : undefined),
    disabled: props.disabled || isLoading,
    ...props
  };

  if (as === 'a') {
    // 'a' タグの場合、disabledは有効な属性ではないため、スタイル/onClick経由で管理します
    const { disabled, ...anchorProps } = commonProps;
    return (
      <a
        {...(anchorProps as unknown as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        className={`${commonProps.className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={disabled ? (e) => e.preventDefault() : props.onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}
      >
        {buttonContent}
      </a>
    );
  }

  return (
    <button {...commonProps}>
      {buttonContent}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  srLabel?: string; // スクリーンリーダー専用ラベル
}

export const Input: React.FC<InputProps> = ({ label, error, className, srLabel, id, ...props }) => {
  const inputId = id || props.name || `input-${Math.random().toString(36).substring(7)}`;
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className={`block text-sm font-medium mb-1 ${ThemeColors.onSurfaceVariant}`}>{label}</label>}
      {srLabel && !label && <label htmlFor={inputId} className="sr-only">{srLabel}</label>}
      <input id={inputId} className={`${CommonStyles.input} ${error ? 'border-red-500' : ''} ${className || ''}`} {...props} />
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};

interface SelectFilterProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  label?: string; 
  srLabel: string; 
  className?: string;
  icon?: React.ReactElement;
}

export const SelectFilter: React.FC<SelectFilterProps> = ({ id, value, onChange, options, label, srLabel, className, icon }) => {
  const inputId = id || `select-${Math.random().toString(36).substring(7)}`;
  return (
    <div className="w-full"> {/* 外側のコンテナ */}
      {label && <label htmlFor={inputId} className={`block text-sm font-medium mb-1 ${ThemeColors.onSurfaceVariant}`}>{label}</label>}
      <div className={`relative w-full ${className || ''}`}> {/* selectとアイコン用の新しい相対ラッパー */}
        {icon && (
          <div 
            className={`absolute left-3 top-0 bottom-0 flex items-center ${ThemeColors.onSurfaceVariant} pointer-events-none`} 
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <select
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={srLabel}
          className={`${CommonStyles.dateInput} w-full appearance-none ${icon ? 'pl-10' : 'pl-3'} pr-8`} 
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div 
          className={`absolute right-3 top-1/2 -translate-y-1/2 ${ThemeColors.onSurfaceVariant} pointer-events-none`} 
          aria-hidden="true"
        >
          <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
        </div>
      </div>
    </div>
  );
};


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  modalClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, modalClassName }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className={CommonStyles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={`${CommonStyles.modalContent} ${modalClassName || 'max-w-md'} max-h-[90vh] overflow-y-auto custom-scrollbar`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 id="modal-title" className="text-xl font-semibold">{title}</h2>
          <Button variant="icon" onClick={onClose} srText={t(I18N_KEYS.MODAL_CLOSE_BUTTON_ARIA)}><Icons.close /></Button>
        </div>
        {children}
      </div>
    </div>
  );
};

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonVariant?: 'primary' | 'danger';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText,
  cancelButtonText,
  confirmButtonVariant = 'danger',
  isLoading = false,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="mb-6">
        {typeof message === 'string' ? <p>{message}</p> : message}
      </div>
      <div className="flex justify-end space-x-3">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelButtonText || t(I18N_KEYS.CANCEL_BUTTON)}
        </Button>
        <Button
          type="button"
          variant={confirmButtonVariant}
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmButtonText || (confirmButtonVariant === 'danger' ? t(I18N_KEYS.DELETE_BUTTON_TOOLTIP) : t(I18N_KEYS.CREATE_BUTTON))}
        </Button>
      </div>
    </Modal>
  );
};


interface SnackbarProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isOpen: boolean;
  onClose: () => void;
}

export const Snackbar: React.FC<SnackbarProps> = ({ message, type, isOpen, onClose }) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    setIsVisible(isOpen);
    if (isOpen) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose(); 
      }, 7000); // 7秒後に自動的に閉じる
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isVisible) return null;

  let bgColor = ThemeColors.infoContainer;
  let textColor = ThemeColors.onInfoContainer;
  let IconComponent = Icons.infoOutline;

  switch (type) {
    case 'success':
      bgColor = ThemeColors.successContainer;
      textColor = ThemeColors.onSuccessContainer;
      IconComponent = Icons.checkCircleOutline;
      break;
    case 'error':
      bgColor = ThemeColors.errorContainer;
      textColor = ThemeColors.onErrorContainer;
      IconComponent = Icons.errorOutline;
      break;
  }
  
  const finalTextColor = textColor.replace(/^text-/, '');
  const finalBgColor = bgColor.replace(/^bg-/, '');


  return (
    <div 
      role={type === 'error' ? "alert" : "status"} 
      aria-live={type === 'error' ? "assertive" : "polite"}
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] p-4 rounded-lg shadow-xl min-w-[300px] max-w-[calc(100%-40px)] flex items-center gap-3 animate-fadeInOut ${finalBgColor} ${finalTextColor}`}
      style={{
        backgroundColor: `var(--tw-bg-${finalBgColor})`, 
        color: `var(--tw-color-${finalTextColor})`,
        animation: 'fadeIn 0.5s ease-out forwards, fadeOut 0.5s ease-in 6.5s forwards'
      }}
    >
      <div className="flex-shrink-0">
        <IconComponent className={`${finalTextColor} w-6 h-6`} />
      </div>
      <div className="flex-grow text-sm">{message}</div>
      <Button 
        variant="icon" 
        onClick={() => { setIsVisible(false); onClose(); }} 
        className={`!p-1 ${finalTextColor} hover:bg-black/10 dark:hover:bg-white/10`}
        srText={t(I18N_KEYS.SNACKBAR_CLOSE_BUTTON_ARIA)}
      >
        <Icons.close className="w-5 h-5"/>
      </Button>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translate(-50%, 0); }
          to { opacity: 0; transform: translate(-50%, 20px); }
        }
        .animate-fadeInOut {
          animation: fadeIn 0.5s forwards, fadeOut 0.5s 6.5s forwards;
        }
      `}</style>
    </div>
  );
};


// 認証コンポーネント
interface LoginScreenProps {
  onLogin: (user: User) => void;
  onGoogleLogin: () => void; 
}
export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGoogleLogin }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) { 
      onLogin({ id: 'user-' + Date.now(), email });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className={`${CommonStyles.card} w-full max-w-md text-center`}>
        <div className="flex justify-center items-center">
          <Icons.drive className="w-16 h-16 text-indigo-600" />
        </div>
        <h1 className={`${CommonStyles.h1} mb-8`}>{t(I18N_KEYS.SIGN_IN_WELCOME)}</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input type="email" placeholder={t(I18N_KEYS.EMAIL_PLACEHOLDER)} value={email} onChange={(e) => setEmail(e.target.value)} required srLabel={t(I18N_KEYS.EMAIL_PLACEHOLDER)} />
          <Input type="password" placeholder={t(I18N_KEYS.PASSWORD_PLACEHOLDER)} value={password} onChange={(e) => setPassword(e.target.value)} required srLabel={t(I18N_KEYS.PASSWORD_PLACEHOLDER)} />
          <Button type="submit" variant="primary" className="w-full" isLoading={false}>{t(I18N_KEYS.SIGN_IN_BUTTON)}</Button>
        </form>
        <div className="my-6 flex items-center">
          <hr className={`flex-grow border-t ${ThemeColors.outline}`} />
          <span className={`px-2 text-sm ${CommonStyles.textMuted}`}>{t(I18N_KEYS.OR_DIVIDER)}</span>
          <hr className={`flex-grow border-t ${ThemeColors.outline}`} />
        </div>
        <Button variant="secondary" onClick={onGoogleLogin} className="w-full" iconLeft={<Icons.google />}>
          {t(I18N_KEYS.SIGN_IN_GOOGLE_BUTTON)}
        </Button>
      </div>
    </div>
  );
};

// ファイルエクスプローラーコンポーネント
interface FileItemProps {
  item: FileSystemItem;
  onSelect: (item: FileSystemItem) => void;
  onOpen: (item: FileSystemItem) => void; 
  onSummarize?: (item: FileSystemItem) => void;
  onDelete?: (item: FileSystemItem) => void;
  onDownload?: (item: FileSystemItem) => void;
  isSelected: boolean;
  deletingItemId?: string | null;
  showActions?: boolean; 
}

export const FileItem: React.FC<FileItemProps> = ({ 
    item, onSelect, onOpen, onSummarize, onDelete, onDownload, isSelected, deletingItemId, showActions = true
}) => {
  const { t, locale } = useTranslation();
  const isDeleting = item.id === deletingItemId;

  const getIcon = () => {
    if (item.type === FileType.FOLDER) return <Icons.folder />;
    const mime = item.mimeType?.toLowerCase() || '';
    if (mime === 'text/markdown') return <Icons.mdFile />;
    if (SPREADSHEET_MIME_TYPES.includes(mime)) return <Icons.spreadsheetFile />;
    if (PRESENTATION_MIME_TYPES.includes(mime)) return <Icons.presentationFile />;
    if (mime.startsWith(AUDIO_MIME_TYPES_PREFIX)) return <Icons.audioFile />;
    if (mime.startsWith(VIDEO_MIME_TYPES_PREFIX)) return <Icons.videoFile />;
    if (mime.startsWith('text/')) return <Icons.textFile />;
    if (mime.startsWith('image/')) return <Icons.imageFile />;
    if (mime === 'application/pdf') return <Icons.pdfFile />;
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mime === 'application/msword') return <Icons.docxFile />;
    return <Icons.file />;
  };
  
  const canSummarize = 
    item.type === FileType.FILE &&
    !!item.mimeType &&
    SUMMARIZABLE_MIME_TYPES.includes(item.mimeType) &&
    !!item.content; 

  const baseClasses = `flex items-center p-3 cursor-pointer transition-colors duration-150 group`;
  const selectedClasses = isSelected ? `${ThemeColors.primaryContainer} ${ThemeColors.onPrimaryContainer}` : `hover:${ThemeColors.surfaceVariant} dark:hover:bg-slate-700`;
  const deletingClasses = isDeleting ? 'opacity-70 cursor-wait' : '';
  const newLayoutStyleClasses = !showActions ? 'border-b border-slate-200 dark:border-slate-700 rounded-none' : 'rounded-lg';


  return (
    <div 
      className={`${baseClasses} ${selectedClasses} ${deletingClasses} ${newLayoutStyleClasses}`}
      onClick={() => !isDeleting && onSelect(item)}
      onDoubleClick={() => !isDeleting && (item.type === FileType.FOLDER ? onOpen(item) : (item.type === FileType.FILE && onOpen(item)))}
      role="button"
      tabIndex={isDeleting ? -1 : 0}
      aria-selected={isSelected}
      aria-busy={isDeleting}
      onKeyDown={(e) => { if (!isDeleting && (e.key === 'Enter' || e.key === ' ')) { item.type === FileType.FOLDER ? onOpen(item) : (item.type === FileType.FILE && onOpen(item))}}}
    >
      <div className="mr-3 text-xl flex-shrink-0">{getIcon()}</div> 
      <div className="flex-grow truncate">
        <p className="font-medium text-sm">{item.name}</p>
        {!showActions && item.type === FileType.FILE && item.size != null && ( 
             <p className={`text-xs ${CommonStyles.textMuted}`}>
                {(item.size / 1024).toFixed(1)} KB
             </p>
        )}
        {showActions && ( 
            <p className={`text-xs ${CommonStyles.textMuted}`}>
            {new Date(item.lastModified).toLocaleDateString(locale)}
            {item.size != null && ` - ${(item.size / 1024).toFixed(1)} KB`}
            </p>
        )}
      </div>
      {showActions && (
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity">
            {item.type === FileType.FILE && onDownload && (
            <Button 
                variant="icon" 
                title={t(I18N_KEYS.DOWNLOAD_BUTTON_TOOLTIP)} 
                onClick={(e) => {e.stopPropagation(); onDownload(item);}} 
                srText={t(I18N_KEYS.DOWNLOAD_BUTTON_TOOLTIP) + ' ' + item.name}
                disabled={isDeleting}
            >
                <Icons.download />
            </Button>
            )}
            {canSummarize && onSummarize && (
            <Button 
                variant="icon" 
                title={t(I18N_KEYS.SUMMARIZE_BUTTON_TOOLTIP)} 
                onClick={(e) => {e.stopPropagation(); onSummarize(item); }} 
                srText={t(I18N_KEYS.SUMMARIZE_BUTTON_TOOLTIP) + ' ' + item.name}
                disabled={isDeleting}
            >
                <Icons.summarize />
            </Button>
            )}
            {onDelete && (
            <Button 
                variant="icon" 
                title={t(I18N_KEYS.DELETE_BUTTON_TOOLTIP)} 
                onClick={(e) => {e.stopPropagation(); onDelete(item); }} 
                srText={t(I18N_KEYS.DELETE_BUTTON_TOOLTIP) + ' ' + item.name}
                isLoading={isDeleting}
                disabled={isDeleting}
            >
                {isDeleting ? null : <Icons.delete />} 
            </Button>
            )}
        </div>
      )}
    </div>
  );
};


interface FileListProps {
  items: FileSystemItem[];
  selectedItemId: string | null;
  deletingItemId?: string | null;
  onSelectItem: (item: FileSystemItem) => void;
  onOpenItem: (item: FileSystemItem) => void;
  onSummarizeItem?: ((item: FileSystemItem) => void) | false;
  onDeleteItem?: ((item: FileSystemItem) => void) | false;
  onDownloadItem?: ((item: FileSystemItem) => void) | false;
  showItemActions?: boolean; 
}

export const FileList: React.FC<FileListProps> = ({ 
    items, selectedItemId, deletingItemId, onSelectItem, onOpenItem, 
    onSummarizeItem, onDeleteItem, onDownloadItem, showItemActions = true 
}) => {
  const { t } = useTranslation();
  if (items.length === 0) {
    return <div className={`text-center py-10 ${CommonStyles.textMuted}`}>{t(I18N_KEYS.FOLDER_EMPTY)}</div>;
  }
  const containerClasses = !showItemActions ? "border-t border-slate-200 dark:border-slate-700" : "space-y-1 p-2";
  
  return (
    <div className={containerClasses} role="list" aria-label={t(I18N_KEYS.FILE_LIST_ARIA)}>
      {items.map(item => (
        <FileItem 
          key={item.id} 
          item={item} 
          onSelect={onSelectItem} 
          onOpen={onOpenItem}
          onSummarize={onSummarizeItem || undefined}
          onDelete={onDeleteItem || undefined}
          onDownload={onDownloadItem || undefined}
          isSelected={item.id === selectedItemId}
          deletingItemId={deletingItemId}
          showActions={showItemActions}
        />
      ))}
    </div>
  );
};

interface FilenameSearchBarProps {
  onSearch: (term: string) => void;
  initialTerm?: string;
}

export const FilenameSearchBar: React.FC<FilenameSearchBarProps> = ({ onSearch, initialTerm = "" }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState(initialTerm);

  useEffect(() => {
    setSearchTerm(initialTerm);
  }, [initialTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <form onSubmit={handleSearch} className="flex items-center w-full relative mb-0" aria-label={t(I18N_KEYS.FILENAME_SEARCH_PLACEHOLDER)}>
      <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${ThemeColors.onSurfaceVariant}`} aria-hidden="true"><Icons.search /></div>
      <Input 
        type="text"
        placeholder={t(I18N_KEYS.FILENAME_SEARCH_PLACEHOLDER)}
        className="pl-12 pr-4 py-3 text-sm" 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        srLabel={t(I18N_KEYS.FILENAME_SEARCH_PLACEHOLDER)}
      />
    </form>
  );
};

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}
export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ startDate, endDate, onStartDateChange, onEndDateChange }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-row flex-wrap items-center gap-x-2 w-full">
            <Icons.calendar className={`${ThemeColors.onSurfaceVariant} text-lg self-center flex-shrink-0`} />
            <div className="flex-grow-0 flex-shrink basis-auto min-w-[110px]">
                <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => onStartDateChange(e.target.value)} 
                    className={`${CommonStyles.dateInput} w-full`}
                    srLabel={t(I18N_KEYS.DATE_RANGE_SR_LABEL_FROM)}
                    placeholder={t(I18N_KEYS.DATE_FROM_PLACEHOLDER)}
                />
            </div>
            <span className={`${ThemeColors.onSurfaceVariant} self-center mx-1 flex-shrink-0`}>-</span>
            <div className="flex-grow-0 flex-shrink basis-auto min-w-[110px]">
                <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => onEndDateChange(e.target.value)} 
                    className={`${CommonStyles.dateInput} w-full`}
                    srLabel={t(I18N_KEYS.DATE_RANGE_SR_LABEL_TO)}
                    placeholder={t(I18N_KEYS.DATE_TO_PLACEHOLDER)}
                />
            </div>
        </div>
    );
};


interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SummaryResult | null;
  fileName: string;
  isLoading: boolean;
  modalClassName?: string;
}
export const SummaryModal: React.FC<SummaryModalProps> = ({ isOpen, onClose, summary, fileName, isLoading, modalClassName }) => {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t(I18N_KEYS.SUMMARY_MODAL_TITLE, { fileName })} modalClassName={modalClassName}>
      {isLoading && <div className="flex justify-center items-center h-40"><Icons.spinner className={`w-10 h-10 ${ThemeColors.onSurfaceVariant}`} /> <p className="ml-2">{t(I18N_KEYS.SUMMARY_LOADING)}</p></div>}
      {!isLoading && summary && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-1">{t(I18N_KEYS.SUMMARY_HEADING)}</h3>
            <div className="text-sm leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownToHTML(summary.text) }} />
          </div>
          <div>
            <h3 className="font-semibold mb-1">{t(I18N_KEYS.KEY_POINTS_HEADING)}</h3>
            {summary.bulletPoints.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-sm prose prose-sm max-w-none">
                {summary.bulletPoints.map((point, index) => <li key={index} dangerouslySetInnerHTML={{ __html: renderInlineMarkdownToHTML(point) }} />)}
              </ul>
            ) : (
              <p className={`text-sm italic ${CommonStyles.textMuted}`}>{t(I18N_KEYS.NO_BULLET_POINTS)}</p>
            )}
          </div>
        </div>
      )}
      {!isLoading && !summary && <p className={`text-center ${CommonStyles.textMuted}`}>{t(I18N_KEYS.SUMMARY_ERROR)}</p>}
    </Modal>
  );
};

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string) => void;
}
export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ isOpen, onClose, onCreateFolder }) => {
  const { t } = useTranslation();
  const [folderName, setFolderName] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      onCreateFolder(folderName.trim());
      setFolderName('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t(I18N_KEYS.CREATE_FOLDER_MODAL_TITLE)}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          label={t(I18N_KEYS.FOLDER_NAME_LABEL)}
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder={t(I18N_KEYS.FOLDER_NAME_PLACEHOLDER)}
          autoFocus
        />
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>{t(I18N_KEYS.CANCEL_BUTTON)}</Button>
          <Button type="submit" variant="primary">{t(I18N_KEYS.CREATE_BUTTON)}</Button>
        </div>
      </form>
    </Modal>
  );
};


interface BreadcrumbsProps {
  path: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void; 
}

export const BreadcrumbsDisplay: React.FC<BreadcrumbsProps> = ({ path, onNavigate }) => {
  const { t } = useTranslation();
  return (
    <nav aria-label={t(I18N_KEYS.BREADCRUMBS_ARIA)} className={`flex items-center space-x-2 text-sm p-3 ${ThemeColors.surfaceVariant} rounded-lg mb-4`}>
      <button onClick={() => onNavigate(null)} className={`hover:underline ${ThemeColors.onSurfaceVariant}`}>
        {t(I18N_KEYS.MY_DRIVE)}
      </button>
      {path.map((item, index) => (
        <React.Fragment key={item.id}>
          <span className={ThemeColors.onSurfaceVariant}>/</span>
          {index === path.length - 1 ? (
            <span className={`font-medium ${ThemeColors.onSurface}`}>{item.name}</span>
          ) : (
            <button onClick={() => onNavigate(item.id)} className={`hover:underline ${ThemeColors.onSurfaceVariant}`}>
              {item.name}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

interface UserProfileProps {
  user: User;
  onLogout: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center space-x-3" aria-label={t(I18N_KEYS.USER_PROFILE_ARIA)}>
      <div className={`flex items-center justify-center`}>
        <Icons.user className={`${ThemeColors.onSurfaceVariant} w-5 h-5`}/>
      </div>
      <button onClick={onLogout} className={`text-xs hover:underline ${CommonStyles.textMuted}`}>{t(I18N_KEYS.SIGN_OUT_BUTTON)}</button>
    </div>
  );
};


interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: AIChatMessage[];
  onSendMessage: (message: string) => void;
  isSending: boolean;
  onVoiceSearchStart?: () => void;
  onVoiceSearchStop?: () => void;
  isListening?: boolean;
  modalClassName?: string;
}

export const AIChatModal: React.FC<AIChatModalProps> = ({ 
  isOpen, onClose, messages, onSendMessage, isSending,
  onVoiceSearchStart, onVoiceSearchStop, isListening, modalClassName
}) => {
  const { t } = useTranslation();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t(I18N_KEYS.AI_CHAT_MODAL_TITLE)} modalClassName={modalClassName || "max-w-lg"}>
      <div className="flex flex-col h-[60vh]">
        <div className="flex-grow overflow-y-auto space-y-4 p-4 custom-scrollbar bg-slate-50 dark:bg-slate-900 rounded-md mb-4">
          {messages.length === 0 && (
            <div className={`text-center ${CommonStyles.textMuted} p-4`}>
              {t(I18N_KEYS.AI_CHAT_WELCOME)}
            </div>
          )}
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`p-3 rounded-lg max-w-[80%] prose prose-sm ${msg.role === 'user' ? `${ThemeColors.primary} ${ThemeColors.onPrimary}` : `${ThemeColors.surfaceVariant} ${ThemeColors.onSurfaceVariant}`}`}
                dangerouslySetInnerHTML={{ __html: renderMarkdownToHTML(msg.text) }}
              />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex items-center space-x-2">
          <Input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t(I18N_KEYS.AI_CHAT_INPUT_PLACEHOLDER)}
            onKeyPress={(e) => { if (e.key === 'Enter' && !isSending) handleSend(); }}
            className="flex-grow"
            disabled={isSending}
            srLabel={t(I18N_KEYS.AI_CHAT_INPUT_PLACEHOLDER)}
          />
          {onVoiceSearchStart && onVoiceSearchStop && (
            <Button 
              variant="icon" 
              onClick={isListening ? onVoiceSearchStop : onVoiceSearchStart}
              disabled={isSending}
              title={t(I18N_KEYS.AI_CHAT_VOICE_TOOLTIP)}
              srText={t(I18N_KEYS.AI_CHAT_VOICE_TOOLTIP)}
            >
              {isListening ? <Icons.stop /> : <Icons.mic />}
            </Button>
          )}
          <Button variant="primary" onClick={handleSend} isLoading={isSending} iconLeft={<Icons.send />} srText={t(I18N_KEYS.AI_CHAT_SEND_BUTTON)}>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface RawContentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileSystemItem | null;
  modalClassName?: string;
}

export const RawContentViewerModal: React.FC<RawContentViewerModalProps> = ({ isOpen, onClose, file, modalClassName }) => {
  const { t } = useTranslation();

  if (!isOpen || !file) return null;

  const title = t(I18N_KEYS.VIEW_RAW_CONTENT_MODAL_TITLE, { fileName: file.name });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} modalClassName={modalClassName || "max-w-2xl"}>
      <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-1">
        {file.mimeType?.startsWith('text/') && file.content && (
          <pre className="text-sm whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800 p-4 rounded-md">{file.content}</pre>
        )}
        {file.mimeType?.startsWith('image/') && file.content && (
          <img 
            src={`data:${file.mimeType};base64,${file.content}`} 
            alt={file.name} 
            className="max-w-full h-auto rounded-md"
          />
        )}
      </div>
    </Modal>
  );
};

interface FileUploadAreaProps {
  onFileUpload: (files: FileList | null) => void;
  onFileUploadFromDrop: (dataTransfer: DataTransfer | null) => void;
  isUploading: boolean;
  targetDirectoryName: string;
  className?: string;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  onFileUpload,
  onFileUploadFromDrop,
  isUploading,
  targetDirectoryName,
  className
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOverSelf, setIsDraggingOverSelf] = useState(false);

  const handleAreaClick = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFileUpload(event.target.files);
    }
     // Reset file input to allow uploading the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isUploading) {
      setIsDraggingOverSelf(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverSelf(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverSelf(false);
    if (!isUploading) {
      onFileUploadFromDrop(event.dataTransfer);
    }
  };
  
  const baseBorderColor = "border-slate-300 dark:border-slate-600";
  const draggingBorderColor = "border-indigo-500 dark:border-indigo-400";
  const baseTextColor = "text-slate-500 dark:text-slate-400";
  const draggingTextColor = "text-indigo-600 dark:text-indigo-400";

  return (
    <div
      className={`relative p-6 border-2 border-dashed rounded-lg text-center cursor-pointer 
                  transition-all duration-200 ease-in-out 
                  ${isDraggingOverSelf ? `bg-indigo-50 dark:bg-indigo-900/30 ${draggingBorderColor}` : `hover:bg-slate-50 dark:hover:bg-slate-800/50 ${baseBorderColor}`}
                  ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}
                  ${className || ''}`}
      onClick={handleAreaClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-disabled={isUploading}
      role="button"
      tabIndex={isUploading ? -1 : 0}
      onKeyDown={(e) => { if (!isUploading && (e.key === 'Enter' || e.key === ' ')) handleAreaClick();}}
    >
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isUploading}
        accept={(window as any).ALLOWED_UPLOAD_EXTENSIONS?.join(',') || '*/*'} // Fallback
      />
      <div className="flex flex-col items-center justify-center pointer-events-none">
        <Icons.upload className={`w-12 h-12 mb-3 ${isDraggingOverSelf ? draggingTextColor : baseTextColor}`} />
        <p className={`text-lg font-medium mb-1 ${isDraggingOverSelf ? draggingTextColor : ThemeColors.onSurface}`}>
          {t(I18N_KEYS.DROP_FILES_HERE_OR_CLICK_PROMPT_TITLE)}
        </p>
        <p className={`text-xs ${baseTextColor}`}>
          {t(I18N_KEYS.DROP_FILES_HERE_OR_CLICK_PROMPT_SUBTITLE, { folderName: targetDirectoryName })}
        </p>
      </div>
    </div>
  );
};