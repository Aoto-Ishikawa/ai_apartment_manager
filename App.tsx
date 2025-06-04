// Speech API 型宣言
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
  readonly interpretation?: any; // 一般的なブラウザ拡張機能、完全性のために含める
  readonly emma?: any; // 一般的なブラウザ拡張機能
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechRecognitionErrorCode;
  readonly message: string;
}

type SpeechRecognitionErrorCode =
  | "no-speech"
  | "aborted"
  | "audio-capture"
  | "network"
  | "not-allowed"
  | "service-not-allowed"
  | "bad-grammar"
  | "language-not-supported";

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  grammars: any; // SpeechGrammarList; SpeechGrammarListが定義/使用されていない場合はanyに簡略化可能
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  serviceURI?: string; // 一部の仕様ではオプション

  start(): void;
  stop(): void;
  abort(): void;

  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;

  addEventListener<K extends keyof SpeechRecognitionEventMap>(type: K, listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener<K extends keyof SpeechRecognitionEventMap>(type: K, listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

interface SpeechRecognitionEventMap {
  "audiostart": Event;
  "audioend": Event;
  "end": Event;
  "error": SpeechRecognitionErrorEvent;
  "nomatch": SpeechRecognitionEvent;
  "result": SpeechRecognitionEvent;
  "soundstart": Event;
  "soundend": Event;
  "speechstart": Event;
  "speechend": Event;
  "start": Event;
}

// TypeScriptがグローバルコンストラクタを認識できるようにする
declare var SpeechRecognition: SpeechRecognitionStatic | undefined;
declare var webkitSpeechRecognition: SpeechRecognitionStatic | undefined;


// webkitGetAsEntryおよび関連するFileSystem APIの手動型定義
interface FileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  // filesystem: FileSystem; // FileSystemEntryのプロパティですが、FileSystem型が利用できない場合があります
  createReader?(): FileSystemDirectoryReader;
  file?(successCallback: (file: File) => void, errorCallback?: (error: DOMException) => void): void;
}

interface FileSystemFileEntry extends FileSystemEntry {
  isFile: true;
  isDirectory: false;
  file(successCallback: (file: File) => void, errorCallback?: (error: DOMException) => void): void;
}

interface FileSystemDirectoryEntry extends FileSystemEntry {
  isFile: false;
  isDirectory: true;
  createReader(): FileSystemDirectoryReader;
}

interface FileSystemDirectoryReader {
  readEntries(
    successCallback: (entries: FileSystemEntry[]) => void,
    errorCallback?: (error: DOMException) => void
  ): void;
}

interface DataTransferItem {
  webkitGetAsEntry(): FileSystemEntry | null;
}


import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, View, FileSystemItem, FileType, SummaryResult, BreadcrumbItem, AccessLevel, AIChatMessage, FileTypeFilterOption, FileSizeFilterOption } from './types';
import { 
  LoginScreen, FileList, FilenameSearchBar, DateRangeFilter, SummaryModal, CreateFolderModal, Button, 
  UserProfile, BreadcrumbsDisplay, AIChatModal, Snackbar, SelectFilter, ConfirmationModal
} from './components';
import { 
    CommonStyles, Icons, ThemeColors, I18N_KEYS, ALLOWED_UPLOAD_EXTENSIONS, SUMMARIZABLE_MIME_TYPES,
    DOCUMENT_MIME_TYPES, IMAGE_MIME_TYPES_PREFIX, SPREADSHEET_MIME_TYPES, PRESENTATION_MIME_TYPES,
    AUDIO_MIME_TYPES_PREFIX, VIDEO_MIME_TYPES_PREFIX,
    FILE_SIZE_SMALL_MAX, FILE_SIZE_MEDIUM_MAX, FILE_SIZE_LARGE_MAX,
    KNOWN_EXTENSION_MIME_TYPES
} from './constants';
import { summarizeText, createAIChat, sendAIChatMessage } from './geminiService';
import { useTranslation } from './LanguageContext';
import { Chat, Content } from '@google/genai';


const w = window as any;
const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
let recognition: SpeechRecognition | null = null; 

if (SpeechRecognitionAPI) {
  recognition = new SpeechRecognitionAPI();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}

// Base64をUint8Arrayに変換するヘルパー関数
function base64ToUint8Array(base64: string): Uint8Array {
  try {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Failed to decode base64 string:", e);
    return new Uint8Array(0); // エラー時は空の配列を返す
  }
}

type SnackbarMessage = {
  message: string;
  type: 'success' | 'error' | 'info';
  key: number; // 同じメッセージでアニメーションを再トリガーするため
};


const App: React.FC = () => {
  const { t, language, setLanguage, locale } = useTranslation();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);
  
  const [allItems, setAllItems] = useState<FileSystemItem[]>([]);
  const [currentPathId, setCurrentPathId] = useState<string | null>(null);
  
  const [selectedItem, setSelectedItem] = useState<FileSystemItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [filenameSearchTerm, setFilenameSearchTerm] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilterOption>('all');
  const [fileSizeFilter, setFileSizeFilter] = useState<FileSizeFilterOption>('all');
  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState<boolean>(false);
  
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState<SummaryResult | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);

  const [isAIChatModalOpen, setIsAIChatModalOpen] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<AIChatMessage[]>([]);
  const [isSendingAIChatMessage, setIsSendingAIChatMessage] = useState(false);
  const aiChatInstanceRef = useRef<Chat | null>(null);
  const [aiChatHistory, setAiChatHistory] = useState<Content[]>([]);


  const [isListening, setIsListening] = useState(false);
  const voiceInputTargetRef = useRef<'filename' | 'aichat' | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToConfirmDelete, setItemToConfirmDelete] = useState<FileSystemItem | null>(null);


  const showSnackbar = (message: string, type: SnackbarMessage['type'] = 'info') => {
    setSnackbar({ message, type, key: Date.now() });
  };

  const closeSnackbar = () => {
    setSnackbar(null);
  };

  useEffect(() => {
    if (fileInputRef.current && currentUser) { 
      const extensions = ALLOWED_UPLOAD_EXTENSIONS.join(',');
      fileInputRef.current.accept = extensions;
    }
  }, [currentUser]); 


  useEffect(() => {
    if (!currentUser) {
      setAllItems([]);
      aiChatInstanceRef.current = null; 
      setAiChatMessages([]);
      setAiChatHistory([]);
    } else {
      aiChatInstanceRef.current = createAIChat(language);
      setAiChatMessages([]); 
      setAiChatHistory([]); 
    }
  }, [currentUser, language]);


  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentView(View.FILE_EXPLORER);
    setAllItems([]); 
    setCurrentPathId(null); 
    setSelectedItem(null);
    setFilenameSearchTerm('');
    setStartDateFilter('');
    setEndDateFilter('');
    setFileTypeFilter('all');
    setFileSizeFilter('all');
    setIsFilterPanelVisible(false);
  };

  const handleLogout = () => {
    setCurrentUser(null); 
    setCurrentView(View.LOGIN);
    setAllItems([]);
    setCurrentPathId(null);
    setSelectedItem(null);
    setFilenameSearchTerm('');
    setStartDateFilter('');
    setEndDateFilter('');
    setFileTypeFilter('all');
    setFileSizeFilter('all');
    setIsFilterPanelVisible(false);
  };

  const handleSelectItem = (item: FileSystemItem) => {
    setSelectedItem(item);
  };

  const handleOpenItem = (item: FileSystemItem) => {
    if (item.type === FileType.FOLDER) {
      setCurrentPathId(item.id);
      setSelectedItem(null); 
      setFilenameSearchTerm(''); 
    } else {
      console.log("Opening file:", item.name);
      const isSummarizableType = item.mimeType && SUMMARIZABLE_MIME_TYPES.includes(item.mimeType);
      if (isSummarizableType && item.content) {
        handleSummarizeItem(item); 
      } else if (item.mimeType && !item.mimeType.startsWith('text/') && !isSummarizableType) {
        showSnackbar(t(I18N_KEYS.OPEN_FILE_NON_TEXT_SIMULATION, { fileName: item.name }), 'info');
      } else {
         showSnackbar(t(I18N_KEYS.OPEN_FILE_ERROR, {fileName: item.name}), 'error');
      }
    }
  };
  
  const processAndAddFile = async (file: File, explicitParentId?: string | null): Promise<boolean> => {
    if (!currentUser) return false;
    
    const parentIdToUse = explicitParentId !== undefined ? explicitParentId : currentPathId;

    const fileName = file.name;
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(fileExtension)) {
      showSnackbar(
        t(I18N_KEYS.UPLOAD_FILE_INVALID_EXTENSION, {
          fileName: file.name,
          fileExtension: fileExtension || "none",
          allowedExtensions: ALLOWED_UPLOAD_EXTENSIONS.join(', ')
        }),
        'error'
      );
      return false;
    }

    let effectiveMimeType = file.type || KNOWN_EXTENSION_MIME_TYPES[fileExtension] || 'application/octet-stream';
    if (KNOWN_EXTENSION_MIME_TYPES[fileExtension]) {
        effectiveMimeType = KNOWN_EXTENSION_MIME_TYPES[fileExtension];
    }


    const newFileBase: Omit<FileSystemItem, 'content' | 'id'> = {
      name: file.name,
      type: FileType.FILE,
      parentId: parentIdToUse,
      mimeType: effectiveMimeType,
      lastModified: Date.now(),
      size: file.size,
      ownerId: currentUser.id,
      access: AccessLevel.OWNER,
    };

    const isTextType = effectiveMimeType.startsWith('text/');
    const isSummarizableDoc = SUMMARIZABLE_MIME_TYPES.includes(effectiveMimeType) &&
      (effectiveMimeType === 'application/pdf' || effectiveMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const isImage = effectiveMimeType.startsWith('image/');
    const isOtherBinary = !isTextType && !isSummarizableDoc && !isImage;


    return new Promise<boolean>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        let fileContent: string | undefined = undefined;
        if (isTextType) {
          fileContent = e.target?.result as string;
        } else if (isSummarizableDoc || isImage || isOtherBinary) { 
          const base64Full = e.target?.result as string;
          fileContent = base64Full.substring(base64Full.indexOf(',') + 1);
        }

        const newFile: FileSystemItem = {
          ...newFileBase,
          id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9) + '-' + file.name.replace(/[^a-zA-Z0-9]/g, ''), 
          content: fileContent,
        };
        setAllItems(prev => [...prev, newFile]);
        resolve(true);
      };
      reader.onerror = () => {
        console.error("Error reading file:", file.name);
        showSnackbar(t(I18N_KEYS.UPLOAD_FILE_GENERIC_ERROR, {fileName: file.name}), 'error');
        resolve(false);
      };

      if (isTextType) {
        reader.readAsText(file);
      } else if (isSummarizableDoc || isImage || isOtherBinary) {
        reader.readAsDataURL(file);
      } else { 
        const newFile: FileSystemItem = {
          ...newFileBase,
          id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9) + '-' + file.name.replace(/[^a-zA-Z0-9]/g, ''),
          content: undefined,
        };
        setAllItems(prev => [...prev, newFile]);
        resolve(true); // コンテンツが読み込まれなくても、アイテムエントリが作成されるためtrueで解決されます。
      }
    });
  };

  const handleFileUpload = async (eventOrFiles: React.ChangeEvent<HTMLInputElement> | FileList) => {
    const files = 'length' in eventOrFiles ? eventOrFiles : eventOrFiles.target.files; 
    if (!files || files.length === 0 || !currentUser || isUploading) return;

    setIsUploading(true);
    let skippedCount = 0;
    
    try {
        for (let i = 0; i < files.length; i++) {
            const success = await processAndAddFile(files[i]);
            if (!success) skippedCount++;
        }
    } catch (error) {
        console.error("Error during file upload process:", error);
        showSnackbar(t(I18N_KEYS.UPLOAD_FILE_GENERIC_ERROR, {fileName: "multiple files"}), 'error');
    } finally {
        if (skippedCount > 0) {
            showSnackbar(t(I18N_KEYS.UPLOAD_COMPLETED_WITH_SKIPS, { skippedCount }), 'error');
        }
        if (fileInputRef.current && 'target' in eventOrFiles) { 
            fileInputRef.current.value = "";
        }
        setIsUploading(false);
    }
  };

  const handleCreateFolder = (name: string) => {
    if (currentUser) {
      const newFolder: FileSystemItem = {
        id: 'folder-' + Date.now() + '-' + name.replace(/[^a-zA-Z0-9]/g, '') + '-' + Math.random().toString(36).substring(2,7),
        name,
        type: FileType.FOLDER,
        parentId: currentPathId,
        lastModified: Date.now(),
        ownerId: currentUser.id,
        access: AccessLevel.OWNER,
        size: 0,
      };
      setAllItems(prev => [...prev, newFolder]);
    }
    setIsCreateFolderModalOpen(false);
  };

  const handleDeleteItem = (itemToDelete: FileSystemItem) => {
    if (!currentUser || itemToDelete.ownerId !== currentUser.id) {
      showSnackbar(t(I18N_KEYS.DELETE_ERROR_PERMISSION), 'error');
      return;
    }
    setItemToConfirmDelete(itemToDelete);
    setIsConfirmModalOpen(true);
  };

  const executeConfirmedItemDelete = async () => {
    if (!itemToConfirmDelete || !currentUser) return;

    setDeletingItemId(itemToConfirmDelete.id);
    setIsConfirmModalOpen(false);

    try {
      // 現実的なローディングのためにネットワーク遅延をシミュレートします
      await new Promise(resolve => setTimeout(resolve, 500));

      setAllItems(prevItems => {
        const itemsToDeleteIds = new Set<string>();
        itemsToDeleteIds.add(itemToConfirmDelete.id);

        if (itemToConfirmDelete.type === FileType.FOLDER) {
          const findDescendants = (folderId: string) => {
            prevItems.forEach(item => {
              if (item.parentId === folderId) {
                itemsToDeleteIds.add(item.id);
                if (item.type === FileType.FOLDER) {
                  findDescendants(item.id);
                }
              }
            });
          };
          findDescendants(itemToConfirmDelete.id);
        }
        return prevItems.filter(item => !itemsToDeleteIds.has(item.id));
      });

      if (selectedItem?.id === itemToConfirmDelete.id || (itemToConfirmDelete.type === FileType.FOLDER && selectedItem?.parentId === itemToConfirmDelete.id)) {
        setSelectedItem(null);
      }
      // 現在のフォルダを削除する場合、親フォルダまたはルートに移動します
      if (currentPathId === itemToConfirmDelete.id && itemToConfirmDelete.type === FileType.FOLDER) {
        setCurrentPathId(itemToConfirmDelete.parentId);
      }

    } catch (error) {
      console.error("Error deleting item:", error);
      showSnackbar(t(I18N_KEYS.DELETE_ERROR_GENERIC, { itemName: itemToConfirmDelete.name }), 'error');
    } finally {
      setDeletingItemId(null);
      setItemToConfirmDelete(null);
    }
  };

  const handleSummarizeItem = async (itemToSummarize: FileSystemItem) => {
    if (!currentUser) return;

    const isSummarizable = itemToSummarize.type === FileType.FILE &&
                           itemToSummarize.mimeType &&
                           SUMMARIZABLE_MIME_TYPES.includes(itemToSummarize.mimeType) &&
                           !!itemToSummarize.content; // コンテンツ（テキストまたはbase64）をロードする必要があります

    if (!isSummarizable) {
      showSnackbar(t(I18N_KEYS.SUMMARIZE_UNSUPPORTED_OR_NO_CONTENT, { fileName: itemToSummarize.name }), 'error');
      return;
    }
    
    setSelectedItem(itemToSummarize); 
    setIsSummaryModalOpen(true);
    setIsSummarizing(true);
    setSummaryContent(null); 

    const summary = await summarizeText(itemToSummarize.content!, itemToSummarize.mimeType!, language);
    setSummaryContent(summary);
    setIsSummarizing(false);
  };

  const handleDownloadItem = (itemToDownload: FileSystemItem) => {
    if (itemToDownload.type === FileType.FOLDER) return;

    if (!itemToDownload.content || !itemToDownload.mimeType) {
      showSnackbar(t(I18N_KEYS.DOWNLOAD_FILE_CONTENT_UNAVAILABLE, { fileName: itemToDownload.name }), 'error');
      return;
    }

    let blob: Blob;
    const isTextStored = itemToDownload.mimeType.startsWith('text/');

    if (isTextStored) {
      blob = new Blob([itemToDownload.content], { type: itemToDownload.mimeType });
    } else { 
      const byteCharacters = base64ToUint8Array(itemToDownload.content);
      if (byteCharacters.length === 0 && itemToDownload.content.length > 0) { 
        showSnackbar(t(I18N_KEYS.DOWNLOAD_FILE_CONTENT_UNAVAILABLE, { fileName: itemToDownload.name }), 'error');
        return;
      }
      blob = new Blob([byteCharacters], { type: itemToDownload.mimeType });
    }
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = itemToDownload.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };


  const handleFilenameSearch = (term: string) => {
    setFilenameSearchTerm(term);
  };

  const handleResetAllFilters = () => {
    setFilenameSearchTerm('');
    setStartDateFilter('');
    setEndDateFilter('');
    setFileTypeFilter('all');
    setFileSizeFilter('all');
  };
  
  const displayedItems = allItems.filter(item => {
    let matchesCurrentPath = true;
    if (filenameSearchTerm) {
      // ファイル名検索語がある場合は、すべてのアイテムを検索します。
    } else {
        matchesCurrentPath = item.parentId === currentPathId;
    }
    
    if (!filenameSearchTerm && !matchesCurrentPath) return false;

    const matchesFilename = !filenameSearchTerm || item.name.toLowerCase().includes(filenameSearchTerm.toLowerCase());
    
    let matchesDate = true;
    if (isFilterPanelVisible) { 
        if (startDateFilter) {
          const startDateTime = new Date(startDateFilter);
          startDateTime.setHours(0,0,0,0); 
          matchesDate = matchesDate && item.lastModified >= startDateTime.getTime();
        }
        if (endDateFilter) {
          const endDateTime = new Date(endDateFilter);
          endDateTime.setHours(23, 59, 59, 999); 
          matchesDate = matchesDate && item.lastModified <= endDateTime.getTime();
        }
    }
    
    let matchesType = true;
    if (isFilterPanelVisible && fileTypeFilter !== 'all') { 
      if (fileTypeFilter === 'folders') {
        matchesType = item.type === FileType.FOLDER;
      } else if (item.type === FileType.FILE) {
        const mime = item.mimeType?.toLowerCase() || '';
        switch (fileTypeFilter) {
          case 'documents':
            matchesType = DOCUMENT_MIME_TYPES.includes(mime);
            break;
          case 'images':
            matchesType = mime.startsWith(IMAGE_MIME_TYPES_PREFIX);
            break;
          case 'spreadsheets':
            matchesType = SPREADSHEET_MIME_TYPES.includes(mime);
            break;
          case 'presentations':
            matchesType = PRESENTATION_MIME_TYPES.includes(mime);
            break;
          case 'audio':
            matchesType = mime.startsWith(AUDIO_MIME_TYPES_PREFIX);
            break;
          case 'video':
            matchesType = mime.startsWith(VIDEO_MIME_TYPES_PREFIX);
            break;
          case 'other':
            matchesType = !DOCUMENT_MIME_TYPES.includes(mime) &&
                          !mime.startsWith(IMAGE_MIME_TYPES_PREFIX) &&
                          !SPREADSHEET_MIME_TYPES.includes(mime) &&
                          !PRESENTATION_MIME_TYPES.includes(mime) &&
                          !mime.startsWith(AUDIO_MIME_TYPES_PREFIX) &&
                          !mime.startsWith(VIDEO_MIME_TYPES_PREFIX);
            break;
          default: matchesType = true;
        }
      } else { 
        matchesType = false;
      }
    }

    let matchesSize = true;
    if (isFilterPanelVisible && fileSizeFilter !== 'all' && item.type === FileType.FILE) { 
      const size = item.size ?? 0;
      switch (fileSizeFilter) {
        case 'small':
          matchesSize = size < FILE_SIZE_SMALL_MAX;
          break;
        case 'medium':
          matchesSize = size >= FILE_SIZE_SMALL_MAX && size < FILE_SIZE_MEDIUM_MAX;
          break;
        case 'large':
          matchesSize = size >= FILE_SIZE_MEDIUM_MAX && size < FILE_SIZE_LARGE_MAX;
          break;
        case 'huge':
          matchesSize = size >= FILE_SIZE_LARGE_MAX;
          break;
      }
    }

    return matchesFilename && matchesDate && matchesType && matchesSize;

  }).sort((a, b) => { 
    if (a.type === FileType.FOLDER && b.type === FileType.FILE) return -1;
    if (a.type === FileType.FILE && b.type === FileType.FOLDER) return 1;
    return a.name.localeCompare(b.name, language === 'ja' ? 'ja' : 'en');
  });


  const handleSendAIChatMessageCallback = useCallback(async (messageText: string) => {
    if (!aiChatInstanceRef.current || !messageText.trim()) return;

    const userMessageForUI: AIChatMessage = { role: 'user', text: messageText.trim() };
    const userContentForHistoryUpdate: Content = { role: 'user', parts: [{ text: messageText.trim() }] };

    setAiChatMessages(prev => [...prev, userMessageForUI]);
    setIsSendingAIChatMessage(true);

    const relevantFilesForContext = filenameSearchTerm || 
                                   (isFilterPanelVisible && (startDateFilter || endDateFilter || fileTypeFilter !== 'all' || fileSizeFilter !== 'all'))
      ? displayedItems 
      : allItems.filter(item => item.parentId === currentPathId);

    const responseText = await sendAIChatMessage(
        aiChatInstanceRef.current, 
        messageText.trim(), 
        relevantFilesForContext,
        language
    );
    
    if (responseText) {
      const modelMessageForUI: AIChatMessage = { role: 'model', text: responseText };
      const modelContentForHistoryUpdate: Content = { role: 'model', parts: [{ text: responseText }] };
      setAiChatMessages(prev => [...prev, modelMessageForUI]);
      setAiChatHistory(prevHistory => [...prevHistory, userContentForHistoryUpdate, modelContentForHistoryUpdate]); 
    } else {
      const errorMessageForUI: AIChatMessage = { role: 'model', text: t(I18N_KEYS.SUMMARY_ERROR) }; 
      setAiChatMessages(prev => [...prev, errorMessageForUI]);
    }
    setIsSendingAIChatMessage(false);
  }, [aiChatInstanceRef, filenameSearchTerm, isFilterPanelVisible, startDateFilter, endDateFilter, fileTypeFilter, fileSizeFilter, displayedItems, allItems, currentPathId, t, language]); 
  
  const handleSendAIChatMessage = handleSendAIChatMessageCallback;
  const handleSendAIChatMessageRef = useRef(handleSendAIChatMessage);
  useEffect(() => {
    handleSendAIChatMessageRef.current = handleSendAIChatMessage;
  }, [handleSendAIChatMessage]);
  
  const startListening = useCallback((target: 'filename' | 'aichat') => {
    if (recognition && !isListening) {
      try {
        voiceInputTargetRef.current = target;
        recognition.lang = language === 'ja' ? 'ja-JP' : 'en-US';
        recognition.start();
        setIsListening(true);
      } catch(e) {
        console.error("Speech recognition start error:", e);
        setIsListening(false); 
        showSnackbar(t(I18N_KEYS.VOICE_RECOGNITION_START_ERROR), 'error');
      }
    } else if (!recognition) {
      showSnackbar(t(I18N_KEYS.VOICE_RECOGNITION_NOT_SUPPORTED), 'error');
    }
  }, [isListening, language, t]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
    }
  }, [isListening]);

  useEffect(() => {
    if (!recognition) return;

    const handleResult = (event: SpeechRecognitionEvent) => {
      const transcriptResult = event.results[0][0].transcript;
      if (voiceInputTargetRef.current === 'aichat') {
        handleSendAIChatMessageRef.current?.(transcriptResult);
      } else if (voiceInputTargetRef.current === 'filename') {
        setFilenameSearchTerm(transcriptResult);
      }
    };
    const handleError = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error, event.message);
      if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'not-allowed') {
        showSnackbar(t(I18N_KEYS.VOICE_RECOGNITION_ERROR_DETAIL, {error: event.error}), 'error');
      }
    };
    const handleEnd = () => {
        setIsListening(false); 
        voiceInputTargetRef.current = null;
    };

    recognition.addEventListener('result', handleResult as EventListener);
    recognition.addEventListener('error', handleError as EventListener);
    recognition.addEventListener('end', handleEnd);

    return () => {
      recognition.removeEventListener('result', handleResult as EventListener);
      recognition.removeEventListener('error', handleError as EventListener);
      recognition.removeEventListener('end', handleEnd);
      if (recognition && isListening) { 
        recognition.abort(); 
      }
    };
  }, [isListening, t, language]); 


  const breadcrumbs: BreadcrumbItem[] = [];
  if (!filenameSearchTerm) { 
    let currentFolderId = currentPathId;
    while (currentFolderId) {
      const folder = allItems.find(item => item.id === currentFolderId);
      if (folder) {
        breadcrumbs.unshift({ id: folder.id, name: folder.name });
        currentFolderId = folder.parentId;
      } else {
        currentFolderId = null; 
      }
    }
  }

  const readAllDirectoryEntries = async (directoryReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => {
    return new Promise((resolve, reject) => {
      const entries: FileSystemEntry[] = [];
      const readEntriesBatch = () => {
        directoryReader.readEntries(
          (batch) => {
            if (batch.length === 0) {
              resolve(entries);
            } else {
              entries.push(...batch);
              readEntriesBatch(); 
            }
          },
          (err) => reject(err)
        );
      };
      readEntriesBatch();
    });
  };
  
  const processDirectoryEntry = async (
    directoryEntry: FileSystemDirectoryEntry,
    parentId: string | null
  ): Promise<number> => {
    if (!currentUser) return 0;
    let skippedFilesInThisDirectory = 0;
  
    const newFolder: FileSystemItem = {
      id: 'folder-' + Date.now() + '-' + directoryEntry.name.replace(/[^a-zA-Z0-9]/g, '') + '-' + Math.random().toString(36).substring(2, 7),
      name: directoryEntry.name,
      type: FileType.FOLDER,
      parentId: parentId,
      lastModified: Date.now(), 
      ownerId: currentUser.id,
      access: AccessLevel.OWNER,
      size: 0, 
    };
    setAllItems(prev => [...prev, newFolder]);
  
    try {
      const directoryReader = directoryEntry.createReader();
      const entries = await readAllDirectoryEntries(directoryReader);
  
      for (const entry of entries) {
        if (entry.isFile) {
          const fileEntry = entry as unknown as FileSystemFileEntry;
          const success: boolean = await new Promise<boolean>((resolveFilePromise) => {
            fileEntry.file(
              async (file) => {
                const added = await processAndAddFile(file, newFolder.id);
                resolveFilePromise(added);
              },
              (err) => {
                console.error(`Error getting file from entry: ${entry.name}`, err);
                showSnackbar(t(I18N_KEYS.UPLOAD_FILE_GENERIC_ERROR, {fileName: entry.name}), 'error');
                resolveFilePromise(false); 
              }
            );
          });
          if (!success) {
            skippedFilesInThisDirectory++;
          }
        } else if (entry.isDirectory) {
          const subDirSkippedCount = await processDirectoryEntry(entry as unknown as FileSystemDirectoryEntry, newFolder.id);
          skippedFilesInThisDirectory += subDirSkippedCount;
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${directoryEntry.name}:`, error);
      showSnackbar(t(I18N_KEYS.UPLOAD_FOLDER_CREATE_ERROR, { folderName: directoryEntry.name }), 'error');
      skippedFilesInThisDirectory++; 
    }
    return skippedFilesInThisDirectory;
  };


  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isUploading) { // アップロード中でない場合にのみドラッグUIを表示
        setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    if (!currentUser || isUploading) return; // アップロード中の場合はドロップを防止
  
    const dataTransferItems = event.dataTransfer.items;
    if (!dataTransferItems || dataTransferItems.length === 0) return;

    setIsUploading(true);
    let totalSkippedFiles = 0;
    const processingPromises: Promise<void>[] = [];
  
    for (let i = 0; i < dataTransferItems.length; i++) {
      const entry = dataTransferItems[i].webkitGetAsEntry();
      if (entry) {
        if (entry.isFile) {
          const fileEntry = entry as unknown as FileSystemFileEntry;
          processingPromises.push(new Promise<void>((resolvePromise) => {
            fileEntry.file(
              async (file) => {
                const added = await processAndAddFile(file, currentPathId);
                if (!added) totalSkippedFiles++;
                resolvePromise();
              },
              (err) => {
                console.error(`Error getting file from file entry: ${entry.name}`, err);
                showSnackbar(t(I18N_KEYS.UPLOAD_FILE_GENERIC_ERROR, {fileName: entry.name}), 'error');
                totalSkippedFiles++;
                resolvePromise();
              }
            );
          }));
        } else if (entry.isDirectory) {
          processingPromises.push(
            processDirectoryEntry(entry as unknown as FileSystemDirectoryEntry, currentPathId)
              .then(skippedCountInDir => { totalSkippedFiles += skippedCountInDir; })
          );
        }
      }
    }
    
    try {
        await Promise.all(processingPromises);
    } catch (error) {
        console.error("Error during drag and drop processing:", error);
        showSnackbar(t(I18N_KEYS.UPLOAD_FILE_GENERIC_ERROR, {fileName: "dragged items"}), 'error');
    } finally {
        if (totalSkippedFiles > 0) {
            showSnackbar(t(I18N_KEYS.UPLOAD_COMPLETED_WITH_SKIPS, { skippedCount: totalSkippedFiles }), 'error');
        } else if (dataTransferItems.length > 0 && processingPromises.length > 0) {
            // 必要に応じて成功メッセージをオプションで表示します。
        }
        setIsUploading(false);
    }
  };
  

  const fileTypeFilterOptions = useMemo(() => [
    { value: 'all', label: t(I18N_KEYS.FILE_TYPE_ALL) },
    { value: 'folders', label: t(I18N_KEYS.FILE_TYPE_FOLDERS) },
    { value: 'documents', label: t(I18N_KEYS.FILE_TYPE_DOCUMENTS) },
    { value: 'images', label: t(I18N_KEYS.FILE_TYPE_IMAGES) },
    { value: 'spreadsheets', label: t(I18N_KEYS.FILE_TYPE_SPREADSHEETS) },
    { value: 'presentations', label: t(I18N_KEYS.FILE_TYPE_PRESENTATIONS) },
    { value: 'audio', label: t(I18N_KEYS.FILE_TYPE_AUDIO) },
    { value: 'video', label: t(I18N_KEYS.FILE_TYPE_VIDEO) },
    { value: 'other', label: t(I18N_KEYS.FILE_TYPE_OTHER) },
  ], [t]);

  const fileSizeFilterOptions = useMemo(() => [
    { value: 'all', label: t(I18N_KEYS.FILE_SIZE_ALL) },
    { value: 'small', label: t(I18N_KEYS.FILE_SIZE_SMALL) },
    { value: 'medium', label: t(I18N_KEYS.FILE_SIZE_MEDIUM) },
    { value: 'large', label: t(I18N_KEYS.FILE_SIZE_LARGE) },
    { value: 'huge', label: t(I18N_KEYS.FILE_SIZE_HUGE) },
  ], [t]);


  if (currentView === View.LOGIN || !currentUser) {
    return (
        <>
            <LoginScreen 
                onLogin={handleLogin} 
                onGoogleLogin={() => showSnackbar(t(I18N_KEYS.GOOGLE_SIGN_IN_DEMO), 'info')} 
            />
            {snackbar && (
              <Snackbar
                key={snackbar.key}
                message={snackbar.message}
                type={snackbar.type}
                isOpen={!!snackbar}
                onClose={closeSnackbar}
              />
            )}
        </>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${ThemeColors.surface} ${ThemeColors.onSurface} overflow-hidden`}>
      <header className={`p-4 border-b ${ThemeColors.outline} shadow-sm sticky top-0 z-20 ${ThemeColors.surface} flex flex-col gap-3`}>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center">
            <Icons.drive className="w-8 h-8 text-indigo-600" />
            <h1 className="text-xl font-semibold ml-3">{t(I18N_KEYS.APP_NAME)}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as 'en' | 'ja')}
              className={`p-2 rounded-md ${ThemeColors.surfaceVariant} ${ThemeColors.onSurfaceVariant} text-sm focus:ring-1 focus:ring-indigo-500 outline-none ${CommonStyles.dateInput}`}
              aria-label="Select language"
            >
              <option value="en">EN</option>
              <option value="ja">JA</option>
            </select>
            {currentUser && <UserProfile user={currentUser} onLogout={handleLogout} />}
          </div>
        </div>

        <div 
          className={`flex flex-col gap-3 p-3 rounded-lg ${ThemeColors.surfaceVariant} w-full`} 
          role="search" 
          aria-label={t(I18N_KEYS.FILTER_ARIA_LABEL)}
        >
          {/* --- 上段: 検索とトグル --- */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <div className="flex-grow min-w-[200px] sm:min-w-[250px]">
              <FilenameSearchBar 
                onSearch={handleFilenameSearch}
                initialTerm={filenameSearchTerm}
              />
            </div>
            <Button
              onClick={() => setIsFilterPanelVisible(!isFilterPanelVisible)}
              iconLeft={<Icons.tune className={`${isFilterPanelVisible ? ThemeColors.onPrimaryContainer : ''} w-7 h-7`} />}
              className={`${CommonStyles.buttonSecondary} w-full sm:w-auto whitespace-nowrap flex-shrink-0`}
            >
              {isFilterPanelVisible ? t(I18N_KEYS.TOGGLE_FILTER_PANEL_HIDE) : t(I18N_KEYS.TOGGLE_FILTER_PANEL_SHOW)}
            </Button>
            <Button
                onClick={handleResetAllFilters}
                variant="icon"
                title={t(I18N_KEYS.RESET_ALL_FILTERS_TOOLTIP)}
                srText={t(I18N_KEYS.RESET_ALL_FILTERS_TOOLTIP)}
                className="p-2 self-center sm:self-auto flex-shrink-0" 
            >
                <Icons.cached className={`${ThemeColors.onPrimaryContainer} w-6 h-6`} />
            </Button>
          </div>

          {/* --- 下段: 条件付きフィルター --- */}
          {isFilterPanelVisible && (
            <div className="w-full mt-3 flex flex-row flex-wrap items-center gap-3">
              <div className="min-w-[150px] flex-grow sm:flex-grow-0">
                <SelectFilter
                  options={fileTypeFilterOptions}
                  value={fileTypeFilter}
                  onChange={(val) => setFileTypeFilter(val as FileTypeFilterOption)}
                  srLabel={t(I18N_KEYS.FILTER_BY_TYPE_SR_LABEL)}
                  icon={<Icons.category className="w-4 h-4 text-base leading-none"/>}
                />
              </div>
              <div className="min-w-[150px] flex-grow sm:flex-grow-0">
                <SelectFilter
                  options={fileSizeFilterOptions}
                  value={fileSizeFilter}
                  onChange={(val) => setFileSizeFilter(val as FileSizeFilterOption)}
                  srLabel={t(I18N_KEYS.FILTER_BY_SIZE_SR_LABEL)}
                  icon={<Icons.storage className="w-4 h-4 text-base leading-none"/>}
                />
              </div>
              <div className="w-full sm:w-auto flex-grow sm:flex-grow-0 min-w-[240px]"> 
                  <DateRangeFilter 
                      startDate={startDateFilter}
                      endDate={endDateFilter}
                      onStartDateChange={setStartDateFilter}
                      onEndDateChange={setEndDateFilter}
                  />
              </div>
            </div>
          )}
        </div>
      </header>
      
      <main 
        className={`flex-grow p-4 overflow-y-auto custom-scrollbar relative ${isDraggingOver && !isUploading ? `border-2 border-dashed ${ThemeColors.outline} rounded-lg` : ''} ${isUploading ? 'opacity-70 cursor-wait' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDraggingOver && !isUploading && (
          <div className="absolute inset-0 bg-indigo-500 bg-opacity-20 flex flex-col items-center justify-center pointer-events-none z-10 rounded-lg">
            <Icons.upload className={`w-16 h-16 ${ThemeColors.onPrimaryContainer} opacity-75 mb-2`} />
            <p className={`text-lg font-semibold ${ThemeColors.onPrimaryContainer} opacity-75`}>{t(I18N_KEYS.DROP_FILES_HERE_PROMPT)}</p>
          </div>
        )}
         {isUploading && (
          <div className="absolute inset-0 bg-slate-400 bg-opacity-30 flex flex-col items-center justify-center pointer-events-auto z-30 rounded-lg backdrop-blur-sm">
            <Icons.spinner className={`w-16 h-16 ${ThemeColors.onPrimaryContainer} mb-2`} />
            <p className={`text-lg font-semibold ${ThemeColors.onPrimaryContainer}`}>{t(I18N_KEYS.SUMMARY_LOADING)}</p> 
          </div>
        )}
        {!filenameSearchTerm && (currentPathId || breadcrumbs.length > 0) && <BreadcrumbsDisplay path={breadcrumbs} onNavigate={(folderId) => { setCurrentPathId(folderId); setFilenameSearchTerm(''); setSelectedItem(null); }} />}
        {filenameSearchTerm && <div className="mb-2 text-sm text-gray-500">{t(I18N_KEYS.SEARCH_RESULTS_HEADING, {searchTerm: filenameSearchTerm})}</div>}
        
        <div className={`mb-4 flex space-x-3 ${isUploading ? 'pointer-events-none' : ''}`}>
          <Button 
            variant="primary" 
            onClick={() => fileInputRef.current?.click()} 
            iconLeft={<Icons.upload />}
            isLoading={isUploading}
            disabled={isUploading}
          >
            {t(I18N_KEYS.UPLOAD_FILE_BUTTON)}
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple disabled={isUploading} />
          <Button 
            variant="secondary" 
            onClick={() => setIsCreateFolderModalOpen(true)} 
            iconLeft={<Icons.addFolder />}
            disabled={isUploading}
          >
            {t(I18N_KEYS.CREATE_FOLDER_BUTTON)}
          </Button>
        </div>

        <FileList 
          items={displayedItems} 
          selectedItemId={selectedItem?.id || null}
          deletingItemId={deletingItemId}
          onSelectItem={handleSelectItem}
          onOpenItem={handleOpenItem}
          onSummarizeItem={currentUser ? handleSummarizeItem : false}
          onDeleteItem={currentUser ? handleDeleteItem : false}
          onDownloadItem={currentUser ? handleDownloadItem : false}
        />
      </main>

      <Button
        variant="icon"
        onClick={() => setIsAIChatModalOpen(true)}
        className={`fixed bottom-6 right-6 z-40 !rounded-full ${ThemeColors.secondary} ${ThemeColors.onSecondary} !p-4 shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75`}
        title={t(I18N_KEYS.ASK_AI_BUTTON)}
        srText={t(I18N_KEYS.ASK_AI_BUTTON)}
        disabled={isUploading}
      >
        <Icons.chat className="w-6 h-6" />
      </Button>

      {selectedItem && selectedItem.type === FileType.FILE && selectedItem.mimeType && SUMMARIZABLE_MIME_TYPES.includes(selectedItem.mimeType) && selectedItem.content && (
        <SummaryModal 
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          summary={summaryContent}
          fileName={selectedItem.name}
          isLoading={isSummarizing}
          modalClassName="w-[80vw] max-w-screen-lg"
        />
      )}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onCreateFolder={handleCreateFolder}
      />
       {itemToConfirmDelete && (
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            setIsConfirmModalOpen(false);
            setItemToConfirmDelete(null);
          }}
          onConfirm={executeConfirmedItemDelete}
          title={t(I18N_KEYS.DELETE_CONFIRM_TITLE)}
          message={t(I18N_KEYS.DELETE_CONFIRM_MESSAGE, { itemName: itemToConfirmDelete.name })}
          confirmButtonText={t(I18N_KEYS.DELETE_BUTTON_TOOLTIP)}
          confirmButtonVariant="danger"
          isLoading={deletingItemId === itemToConfirmDelete.id}
        />
      )}
      <AIChatModal
        isOpen={isAIChatModalOpen}
        onClose={() => setIsAIChatModalOpen(false)}
        messages={aiChatMessages}
        onSendMessage={handleSendAIChatMessage}
        isSending={isSendingAIChatMessage}
        onVoiceSearchStart={recognition ? () => startListening('aichat') : undefined}
        onVoiceSearchStop={recognition ? stopListening : undefined}
        isListening={isListening && voiceInputTargetRef.current === 'aichat'}
        modalClassName="w-[80vw] max-w-screen-lg"
      />
      {snackbar && (
        <Snackbar
          key={snackbar.key}
          message={snackbar.message}
          type={snackbar.type}
          isOpen={!!snackbar}
          onClose={closeSnackbar}
        />
      )}
    </div>
  );
};

export default App;