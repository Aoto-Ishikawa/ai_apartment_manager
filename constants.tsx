

import React from 'react';

// 国際化対応用のキー
export const I18N_KEYS = {
  APP_NAME: "appName",
  SIGN_IN_WELCOME: "signInWelcome",
  SIGN_IN_PROMPT: "signInPrompt",
  EMAIL_PLACEHOLDER: "emailPlaceholder",
  PASSWORD_PLACEHOLDER: "passwordPlaceholder",
  SIGN_IN_BUTTON: "signInButton",
  OR_DIVIDER: "orDivider",
  SIGN_IN_GOOGLE_BUTTON: "signInGoogleButton",
  FOLDER_EMPTY: "folderEmpty",
  SEARCH_FILES_PLACEHOLDER: "searchFilesPlaceholder",
  VOICE_START_TOOLTIP: "voiceStartTooltip",
  VOICE_STOP_TOOLTIP: "voiceStopTooltip",
  SUMMARY_MODAL_TITLE: "summaryModalTitle",
  SUMMARY_HEADING: "summaryHeading",
  KEY_POINTS_HEADING: "keyPointsHeading",
  NO_BULLET_POINTS: "noBulletPoints",
  SUMMARY_LOADING: "summaryLoading",
  SUMMARY_ERROR: "summaryError",
  CREATE_FOLDER_MODAL_TITLE: "createFolderModalTitle",
  FOLDER_NAME_LABEL: "folderNameLabel",
  FOLDER_NAME_PLACEHOLDER: "folderNamePlaceholder",
  CANCEL_BUTTON: "cancelButton",
  CREATE_BUTTON: "createButton",
  MY_DRIVE: "myDrive",
  SIGN_OUT_BUTTON: "signOutButton",
  UPLOAD_FILE_BUTTON: "uploadFileButton",
  CREATE_FOLDER_BUTTON: "createFolderButton",
  SEARCH_RESULTS_HEADING: "searchResultsHeading",
  DELETE_CONFIRM_TITLE: "deleteConfirmTitle",
  DELETE_CONFIRM_MESSAGE: "deleteConfirmMessage",
  DELETE_ERROR_PERMISSION: "deleteErrorPermission",
  DELETE_ERROR_GENERIC: "deleteErrorGeneric",
  SUMMARIZE_UNSUPPORTED_OR_NO_CONTENT: "summarizeUnsupportedOrNoContent",
  UPLOAD_FILE_INVALID_EXTENSION: "uploadFileInvalidExtension", 
  OPEN_FILE_ERROR: "openFileError",
  OPEN_FILE_NON_TEXT_SIMULATION: "openFileNonTextSimulation",
  UPLOAD_BUTTON: "uploadButton",
  ADD_FOLDER_BUTTON: "addFolderButton",
  SUMMARIZE_BUTTON_TOOLTIP: "summarizeButtonTooltip",
  DELETE_BUTTON_TOOLTIP: "deleteButtonTooltip",
  DOWNLOAD_BUTTON_TOOLTIP: "downloadButtonTooltip",
  DOWNLOAD_FILE_CONTENT_UNAVAILABLE: "downloadFileContentUnavailable",
  USER_PROFILE_ARIA: "userProfileAria",
  BREADCRUMBS_ARIA: "breadcrumbsAria",
  FILE_LIST_ARIA: "fileListAria",
  MODAL_CLOSE_BUTTON_ARIA: "modalCloseButtonAria",
  SNACKBAR_CLOSE_BUTTON_ARIA: "snackbarCloseButtonAria",
  SEARCH_BAR_ARIA: "searchBarAria",
  GOOGLE_SIGN_IN_DEMO: "googleSignInDemo",
  VOICE_RECOGNITION_START_ERROR: "voiceRecognitionStartError",
  VOICE_RECOGNITION_NOT_SUPPORTED: "voiceRecognitionNotSupported",
  VOICE_RECOGNITION_ERROR_DETAIL: "voiceRecognitionErrorDetail",
  ASK_AI_BUTTON: "askAIButton",
  AI_CHAT_MODAL_TITLE: "aiChatModalTitle",
  AI_CHAT_INPUT_PLACEHOLDER: "aiChatInputPlaceholder",
  AI_CHAT_SEND_BUTTON: "aiChatSendButton",
  AI_CHAT_WELCOME: "aiChatWelcome",
  AI_CHAT_VOICE_TOOLTIP: "aiChatVoiceTooltip",
  FILENAME_SEARCH_PLACEHOLDER: "filenameSearchPlaceholder",
  DATE_RANGE_SR_LABEL_FROM: "dateRangeSrLabelFrom",
  DATE_RANGE_SR_LABEL_TO: "dateRangeSrLabelTo",
  DATE_FROM_PLACEHOLDER: "dateFromPlaceholder",
  DATE_TO_PLACEHOLDER: "dateToPlaceholder",
  FILTER_ARIA_LABEL: "filterAriaLabel",
  TOGGLE_FILTER_PANEL_SHOW: "toggleFilterPanelShow", 
  TOGGLE_FILTER_PANEL_HIDE: "toggleFilterPanelHide",   
  RESET_ALL_FILTERS_TOOLTIP: "resetAllFiltersTooltip",
  DROP_FILES_HERE_PROMPT: "dropFilesHerePrompt", 
  FILTER_BY_TYPE_SR_LABEL: "filterByTypeSrLabel",
  FILTER_BY_SIZE_SR_LABEL: "filterBySizeSrLabel",
  FILE_TYPE_ALL: "fileTypeAll",
  FILE_TYPE_FOLDERS: "fileTypeFolders",
  FILE_TYPE_DOCUMENTS: "fileTypeDocuments",
  FILE_TYPE_IMAGES: "fileTypeImages",
  FILE_TYPE_SPREADSHEETS: "fileTypeSpreadsheets",
  FILE_TYPE_PRESENTATIONS: "fileTypePresentations",
  FILE_TYPE_AUDIO: "fileTypeAudio",
  FILE_TYPE_VIDEO: "fileTypeVideo",
  FILE_TYPE_OTHER: "fileTypeOther",
  FILE_SIZE_ALL: "fileSizeAll",
  FILE_SIZE_SMALL: "fileSizeSmall", // < 1MB
  FILE_SIZE_MEDIUM: "fileSizeMedium", // 1MB - 50MB
  FILE_SIZE_LARGE: "fileSizeLarge", // 50MB - 500MB
  FILE_SIZE_HUGE: "fileSizeHuge", // > 500MB
  UPLOAD_FILE_GENERIC_ERROR: "uploadFileGenericError",
  UPLOAD_COMPLETED_WITH_SKIPS: "uploadCompletedWithSkips",
  UPLOAD_FOLDER_CREATE_ERROR: "uploadFolderCreateError",
};


// Material Design 3風カラーパレット (Tailwindへの概念的マッピング)
export const ThemeColors = {
  primary: 'bg-indigo-600',
  onPrimary: 'text-white',
  primaryContainer: 'bg-indigo-100',
  onPrimaryContainer: 'text-indigo-900',
  secondary: 'bg-purple-600',
  onSecondary: 'text-white',
  surface: 'bg-white dark:bg-slate-800',
  onSurface: 'text-slate-900 dark:text-slate-100',
  surfaceVariant: 'bg-slate-100 dark:bg-slate-700', 
  onSurfaceVariant: 'text-slate-700 dark:text-slate-300',
  outline: 'border-slate-300 dark:border-slate-600',
  error: 'bg-red-600',
  onError: 'text-white',
  errorContainer: 'bg-red-100 dark:bg-red-900',
  onErrorContainer: 'text-red-700 dark:text-red-200',
  success: 'bg-green-600',
  onSuccess: 'text-white',
  successContainer: 'bg-green-100 dark:bg-green-900',
  onSuccessContainer: 'text-green-700 dark:text-green-200',
  info: 'bg-blue-600',
  onInfo: 'text-white',
  infoContainer: 'bg-blue-100 dark:bg-blue-900',
  onInfoContainer: 'text-blue-700 dark:text-blue-200',
};

// UI要素用の共通Tailwindクラス文字列
export const CommonStyles = {
  buttonPrimary: `px-6 py-3 ${ThemeColors.primary} ${ThemeColors.onPrimary} rounded-full shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-all duration-200 ease-in-out text-sm font-medium flex items-center justify-center gap-2`,
  buttonSecondary: `px-4 py-2 ${ThemeColors.primaryContainer} ${ThemeColors.onPrimaryContainer} rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-opacity-50 transition-all duration-200 ease-in-out text-sm font-medium flex items-center justify-center gap-2`, 
  buttonIcon: `p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-colors duration-150`,
  input: `w-full px-4 py-3 ${ThemeColors.surface} ${ThemeColors.onSurface} border ${ThemeColors.outline} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors duration-150 shadow-sm`,
  dateInput: `px-3 py-2 h-10 ${ThemeColors.surface} ${ThemeColors.onSurface} border ${ThemeColors.outline} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors duration-150 shadow-sm text-sm`,
  card: `${ThemeColors.surface} ${ThemeColors.onSurface} rounded-xl shadow-lg p-6`,
  modalOverlay: `fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4`,
  modalContent: `${ThemeColors.surface} ${ThemeColors.onSurface} rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all duration-300 ease-out`,
  h1: `text-3xl font-bold ${ThemeColors.onSurface}`,
  h2: `text-2xl font-semibold ${ThemeColors.onSurfaceVariant}`,
  textMuted: `text-slate-500 dark:text-slate-400`,
};

const IconBase: React.FC<React.HTMLAttributes<HTMLSpanElement> & { iconName: string }> = ({ iconName, className, ...props }) => (
  <span className={`material-icons ${className || ''}`} {...props}>{iconName}</span>
);

export const Icons = {
  folder: (props?: { className?: string }) => <IconBase iconName="folder" className={`text-yellow-500 ${props?.className || ''}`} />,
  file: (props?: { className?: string }) => <IconBase iconName="insert_drive_file" className={`text-slate-500 ${props?.className || ''}`} />,
  textFile: (props?: { className?: string }) => <IconBase iconName="description" className={`text-blue-500 ${props?.className || ''}`} />,
  imageFile: (props?: { className?: string }) => <IconBase iconName="image" className={`text-green-500 ${props?.className || ''}`} />, 
  pdfFile: (props?: { className?: string }) => <IconBase iconName="picture_as_pdf" className={`text-red-500 ${props?.className || ''}`} />,
  mdFile: (props?: { className?: string }) => <IconBase iconName="article" className={`text-gray-600 dark:text-gray-400 ${props?.className || ''}`} />,
  docxFile: (props?: { className?: string }) => <IconBase iconName="library_books" className={`text-blue-700 dark:text-blue-400 ${props?.className || ''}`} />,
  spreadsheetFile: (props?: { className?: string }) => <IconBase iconName="view_list" className={`text-emerald-600 dark:text-emerald-400 ${props?.className || ''}`} />, 
  presentationFile: (props?: { className?: string }) => <IconBase iconName="slideshow" className={`text-orange-600 dark:text-orange-400 ${props?.className || ''}`} />,
  audioFile: (props?: { className?: string }) => <IconBase iconName="audiotrack" className={`text-pink-500 ${props?.className || ''}`} />,
  videoFile: (props?: { className?: string }) => <IconBase iconName="movie" className={`text-red-700 ${props?.className || ''}`} />,
  upload: (props?: { className?: string }) => <IconBase iconName="cloud_upload" className={props?.className} />,
  download: (props?: { className?: string }) => <IconBase iconName="file_download" className={`text-teal-500 ${props?.className || ''}`} />,
  delete: (props?: { className?: string }) => <IconBase iconName="delete" className={`text-red-500 ${props?.className || ''}`} />,
  summarize: (props?: { className?: string }) => <IconBase iconName="auto_awesome" className={`text-purple-500 ${props?.className || ''}`} />,
  search: (props?: { className?: string }) => <IconBase iconName="search" className={props?.className} />,
  mic: (props?: { className?: string }) => <IconBase iconName="mic" className={props?.className} />,
  stop: (props?: { className?: string }) => <IconBase iconName="stop_circle" className={props?.className} />,
  addFolder: (props?: { className?: string }) => <IconBase iconName="create_new_folder" className={props?.className} />,
  close: (props?: { className?: string }) => <IconBase iconName="close" className={props?.className} />,
  user: (props?: { className?: string }) => <IconBase iconName="person" className={props?.className} />,
  logout: (props?: { className?: string }) => <IconBase iconName="logout" className={props?.className} />,
  drive: (props?: { className?: string }) => <IconBase iconName="folder_special" className={`text-sky-600 ${props?.className || ''}`} />,
  menu: (props?: { className?: string }) => <IconBase iconName="more_vert" className={props?.className} />,
  edit: (props?: { className?: string }) => <IconBase iconName="edit" className={`text-blue-500 ${props?.className || ''}`} />,
  view: (props?: { className?: string }) => <IconBase iconName="visibility" className={`text-green-500 ${props?.className || ''}`} />,
  chat: (props?: { className?: string }) => <IconBase iconName="chat_bubble_outline" className={props?.className} />,
  send: (props?: { className?: string }) => <IconBase iconName="send" className={props?.className} />,
  calendar: (props?: { className?: string }) => <IconBase iconName="calendar_today" className={props?.className} />,
  clear: (props?: { className?: string }) => <IconBase iconName="clear" className={props?.className} />, 
  filterList: (props?: { className?: string }) => <IconBase iconName="filter_list" className={props?.className} />, 
  filterListOff: (props?: { className?: string }) => <IconBase iconName="filter_list_off" className={props?.className} />, 
  cached: (props?: { className?: string }) => <IconBase iconName="cached" className={props?.className} />,
  category: (props?: { className?: string }) => <IconBase iconName="category" className={props?.className} />, 
  storage: (props?: { className?: string }) => <IconBase iconName="storage" className={props?.className} />, 
  tune: (props?: { className?: string }) => <IconBase iconName="tune" className={props?.className} />, 
  errorOutline: (props?: { className?: string }) => <IconBase iconName="error_outline" className={`text-red-700 dark:text-red-200 ${props?.className || ''}`} />, 
  infoOutline: (props?: { className?: string }) => <IconBase iconName="info_outline" className={`text-blue-700 dark:text-blue-200 ${props?.className || ''}`} />, 
  checkCircleOutline: (props?: { className?: string }) => <IconBase iconName="check_circle_outline" className={`text-green-700 dark:text-green-200 ${props?.className || ''}`} />,
  google: (props?: { className?: string }) => (
    <svg className={`w-5 h-5 ${props?.className || ''}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      <path d="M1 1h22v22H1z" fill="none" />
    </svg>
  ),
  spinner: (props?: { className?: string }) => (
    <svg className={`animate-spin h-5 w-5 text-white ${props?.className || ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
};

export const ALLOWED_UPLOAD_EXTENSIONS = [
  '.txt', 
  '.md',
  '.pdf', 
  '.docx',
  '.csv', '.xls', '.xlsx', // スプレッドシート
  '.ppt', '.pptx', // プレゼンテーション
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', // 画像
  '.mp3', '.wav', '.ogg', // 音声
  '.mp4', '.mov', '.avi', '.webm', // 動画
];

export const SUMMARIZABLE_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export const DOCUMENT_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/rtf', // .rtf
  'application/vnd.oasis.opendocument.text', // .odt
];

export const IMAGE_MIME_TYPES_PREFIX = 'image/'; 

export const SPREADSHEET_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.oasis.opendocument.spreadsheet', // .ods
];

export const PRESENTATION_MIME_TYPES = [
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.oasis.opendocument.presentation', // .odp
];

export const AUDIO_MIME_TYPES_PREFIX = 'audio/';
export const VIDEO_MIME_TYPES_PREFIX = 'video/';

// ファイルサイズのしきい値 (バイト)
export const FILE_SIZE_SMALL_MAX = 1 * 1024 * 1024; // 1MB
export const FILE_SIZE_MEDIUM_MAX = 50 * 1024 * 1024; // 50MB
export const FILE_SIZE_LARGE_MAX = 500 * 1024 * 1024; // 500MB
// FILE_SIZE_LARGE_MAXを超えるものは「巨大」

// file.typeを補完するための、アップロード用の既知のMIMEタイプロッピング
export const KNOWN_EXTENSION_MIME_TYPES: Record<string, string> = {
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // file.typeが信頼できない場合に備えて、必要に応じてより一般的なタイプを追加
};