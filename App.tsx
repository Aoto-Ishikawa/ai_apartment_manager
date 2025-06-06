
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
  UserProfile, BreadcrumbsDisplay, AIChatModal, Snackbar, SelectFilter, ConfirmationModal, RawContentViewerModal,
  FileUploadArea, Input // Added Input here
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
  const { t, language, setLanguage, locale } = useTranslation(); // setLanguage is no longer used from UI

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);
  
  const [allItems, setAllItems] = useState<FileSystemItem[]>([]);
  const [currentPathId, setCurrentPathId] = useState<string | null>(null);
  
  const [selectedItem, setSelectedItem] = useState<FileSystemItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [filenameSearchTerm, setFilenameSearchTerm] = useState<string>('');
  // Filters below are kept in state but UI for them is removed for now
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilterOption>('all');
  const [fileSizeFilter, setFileSizeFilter] = useState<FileSizeFilterOption>('all');
  
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
  
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToConfirmDelete, setItemToConfirmDelete] = useState<FileSystemItem | null>(null);

  const [isRawContentViewerOpen, setIsRawContentViewerOpen] = useState(false);
  const [rawContentFile, setRawContentFile] = useState<FileSystemItem | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sortConfig, setSortConfig] = useState({ 
    key: 'name' as 'name' | 'lastModified' | 'size', 
    direction: 'asc' as 'asc' | 'desc' 
  });


  const showSnackbar = (message: string, type: SnackbarMessage['type'] = 'info') => {
    setSnackbar({ message, type, key: Date.now() });
  };

  const closeSnackbar = () => {
    setSnackbar(null);
  };


  useEffect(() => {
    if (!currentUser) {
      setAllItems([]);
      aiChatInstanceRef.current = null; 
      setAiChatMessages([]);
      setAiChatHistory([]);
    } else {
      aiChatInstanceRef.current = createAIChat('ja'); // Default to Japanese
      setAiChatMessages([]); 
      setAiChatHistory([]); 
    }
  }, [currentUser]); // language removed as it's fixed to 'ja'


  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentView(View.FILE_EXPLORER);
    setAllItems([]); // Remove initial sample data
    setCurrentPathId(null); 
    setSelectedItem(null);
    setFilenameSearchTerm('');
    setStartDateFilter('');
    setEndDateFilter('');
    setFileTypeFilter('all');
    setFileSizeFilter('all');
    setIsSidebarOpen(true); // Ensure sidebar is open on login
    setSortConfig({ key: 'name', direction: 'asc' }); // Reset sort on login
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
  };

  const handleSelectItem = (item: FileSystemItem) => {
    setSelectedItem(item);
  };

  const handleOpenItem = (item: FileSystemItem) => {
    if (item.type === FileType.FOLDER) {
      setCurrentPathId(item.id);
      setSelectedItem(null); 
      setFilenameSearchTerm(''); 
    } else { // File
      const isSummarizable = item.mimeType && SUMMARIZABLE_MIME_TYPES.includes(item.mimeType) && !!item.content;
      const isText = item.mimeType?.startsWith('text/') && !!item.content;
      const isImage = item.mimeType?.startsWith('image/') && !!item.content;
      const isPdf = item.mimeType === 'application/pdf' && !!item.content;

      if (isSummarizable) {
        handleSummarizeItem(item);
      } else if (isText) {
        setRawContentFile(item);
        setIsRawContentViewerOpen(true);
      } else if (isImage) {
        setRawContentFile(item);
        setIsRawContentViewerOpen(true);
      } else if (isPdf) {
        try {
            const byteCharacters = base64ToUint8Array(item.content!);
            const blob = new Blob([byteCharacters], { type: item.mimeType });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            URL.revokeObjectURL(url); // Clean up
        } catch (e) {
            console.error("Error opening PDF:", e);
            showSnackbar(t(I18N_KEYS.OPEN_FILE_ERROR, {fileName: item.name}), 'error');
        }
      } else {
        // Fallback to download for other types or if content missing for specific viewers
        if (item.content) {
             showSnackbar(t(I18N_KEYS.OPENING_FILE_BY_DOWNLOAD, { fileName: item.name }), 'info');
            handleDownloadItem(item);
        } else {
            showSnackbar(t(I18N_KEYS.OPEN_FILE_ERROR, {fileName: item.name}), 'error');
        }
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

 const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentUser || isUploading) return;

    setIsUploading(true);
    let skippedCount = 0;
    const processingPromises: Promise<void>[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isDirectoryPlaceholder = file.type === "" && file.size % 4096 === 0; // Heuristic for directories
        if (isDirectoryPlaceholder) { // Placeholder for directory, try to process via webkitGetAsEntry if available
            // This path is more for completeness if DataTransferItem was a File, but usually handled by webkitGetAsEntry directly
            showSnackbar(t(I18N_KEYS.UPLOAD_FOLDER_DRAGGED_DIRECTLY), 'info'); // Add this I18N key
            skippedCount++;
            continue;
        }
        processingPromises.push(
            processAndAddFile(file).then(success => {
                if (!success) skippedCount++;
            })
        );
    }

    try {
        await Promise.all(processingPromises);
    } catch (error) {
        console.error("Error during file upload process:", error);
        showSnackbar(t(I18N_KEYS.UPLOAD_FILE_GENERIC_ERROR, {fileName: "multiple files"}), 'error');
    } finally {
        if (skippedCount > 0) {
            showSnackbar(t(I18N_KEYS.UPLOAD_COMPLETED_WITH_SKIPS, { skippedCount }), 'error');
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

  const handleDeleteItem = (itemToDelete: FileSystemItem | null) => {
    if (!itemToDelete) return;
    setItemToConfirmDelete(itemToDelete);
    setIsConfirmModalOpen(true);
  };

  const executeConfirmedItemDelete = async () => {
    if (!itemToConfirmDelete || !currentUser) return;

    setDeletingItemId(itemToConfirmDelete.id);
    setIsConfirmModalOpen(false);

    try {
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
      if (currentPathId === itemToConfirmDelete.id && itemToConfirmDelete.type === FileType.FOLDER) {
        setCurrentPathId(itemToConfirmDelete.parentId);
      }

    } catch (error) {
      console.error("Error deleting item:", error);
      showSnackbar(t(I18N_KEYS.DELETE_ERROR_GENERIC, { itemName: itemToConfirmDelete.name }), 'error');
    } finally {
      setDeletingItemId(null);
      setItemToConfirmDelete(null);
      setSelectedItem(null); // Deselect item after deletion attempt
    }
  };

  const handleSummarizeItem = async (itemToSummarize: FileSystemItem) => {
    if (!currentUser) return;

    const isSummarizable = itemToSummarize.type === FileType.FILE &&
                           itemToSummarize.mimeType &&
                           SUMMARIZABLE_MIME_TYPES.includes(itemToSummarize.mimeType) &&
                           !!itemToSummarize.content; 

    if (!isSummarizable) {
      showSnackbar(t(I18N_KEYS.SUMMARIZE_UNSUPPORTED_OR_NO_CONTENT, { fileName: itemToSummarize.name }), 'error');
      return;
    }
    
    setSelectedItem(itemToSummarize); 
    setIsSummaryModalOpen(true);
    setIsSummarizing(true);
    setSummaryContent(null); 

    const summary = await summarizeText(itemToSummarize.content!, itemToSummarize.mimeType!, 'ja'); // Fixed to 'ja'
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

  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    const path: BreadcrumbItem[] = [];
    let tempCurrentFolderId = currentPathId;
    while (tempCurrentFolderId) {
      const folder = allItems.find(item => item.id === tempCurrentFolderId);
      if (folder) {
        path.unshift({ id: folder.id, name: folder.name });
        tempCurrentFolderId = folder.parentId;
      } else {
        tempCurrentFolderId = null; 
      }
    }
    return path;
  }, [currentPathId, allItems]);
  
  const handleFilenameSearchChange = (term: string) => {
    setFilenameSearchTerm(term);
    if (term) {
      setCurrentPathId(null); // Search globally
    } else {
      // If search is cleared, return to the folder pointed by the last breadcrumb, or root if no breadcrumbs
      const lastBreadcrumbId = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].id : null;
      setCurrentPathId(lastBreadcrumbId);
    }
  };
  
  const displayedItems = useMemo(() => allItems.filter(item => {
    let matchesCurrentPathOrSearch = filenameSearchTerm ? true : item.parentId === currentPathId;
    if (!matchesCurrentPathOrSearch) return false;
    const matchesFilename = !filenameSearchTerm || item.name.toLowerCase().includes(filenameSearchTerm.toLowerCase());
    // Other filters (date, type, size) are currently not used in UI but logic remains
    return matchesFilename;
  }).sort((a, b) => { 
    if (a.type === FileType.FOLDER && b.type === FileType.FILE) return -1;
    if (a.type === FileType.FILE && b.type === FileType.FOLDER) return 1;

    const valA = (a[sortConfig.key] || '').toString().toLowerCase();
    const valB = (b[sortConfig.key] || '').toString().toLowerCase();
    
    let comparison = 0;
    if (valA < valB) {
      comparison = -1;
    } else if (valA > valB) {
      comparison = 1;
    }
    return sortConfig.direction === 'asc' ? comparison : comparison * -1;
  }), [allItems, filenameSearchTerm, currentPathId, sortConfig]);


  const handleSendAIChatMessageCallback = useCallback(async (messageText: string) => {
    if (!aiChatInstanceRef.current || !messageText.trim()) return;

    const userMessageForUI: AIChatMessage = { role: 'user', text: messageText.trim() };
    setAiChatMessages(prev => [...prev, userMessageForUI]);
    setIsSendingAIChatMessage(true);

    const relevantFilesForContext = filenameSearchTerm ? displayedItems : allItems.filter(item => item.parentId === currentPathId);

    const responseText = await sendAIChatMessage(
        aiChatInstanceRef.current, 
        messageText.trim(), 
        relevantFilesForContext,
        'ja' // Fixed to 'ja'
    );
    
    if (responseText) {
      const modelMessageForUI: AIChatMessage = { role: 'model', text: responseText };
      setAiChatMessages(prev => [...prev, modelMessageForUI]);
    } else {
      const errorMessageForUI: AIChatMessage = { role: 'model', text: t(I18N_KEYS.SUMMARY_ERROR) }; 
      setAiChatMessages(prev => [...prev, errorMessageForUI]);
    }
    setIsSendingAIChatMessage(false);
  }, [aiChatInstanceRef, filenameSearchTerm, displayedItems, allItems, currentPathId, t]); 
  
  const handleSendAIChatMessage = handleSendAIChatMessageCallback;
  const handleSendAIChatMessageRef = useRef(handleSendAIChatMessage);
  useEffect(() => { handleSendAIChatMessageRef.current = handleSendAIChatMessage; }, [handleSendAIChatMessage]);
  
  const startListening = useCallback((target: 'filename' | 'aichat') => {
    if (recognition && !isListening) {
      try {
        voiceInputTargetRef.current = target;
        recognition.lang = 'ja-JP'; // Fixed to Japanese
        recognition.start(); setIsListening(true);
      } catch(e) {
        console.error("Speech recognition start error:", e);
        setIsListening(false); 
        showSnackbar(t(I18N_KEYS.VOICE_RECOGNITION_START_ERROR), 'error');
      }
    } else if (!recognition) {
      showSnackbar(t(I18N_KEYS.VOICE_RECOGNITION_NOT_SUPPORTED), 'error');
    }
  }, [isListening, t]);

  const stopListening = useCallback(() => { if (recognition && isListening) { recognition.stop(); } }, [isListening]);

  useEffect(() => {
    if (!recognition) return;
    const handleResult = (event: SpeechRecognitionEvent) => {
      const transcriptResult = event.results[0][0].transcript;
      if (voiceInputTargetRef.current === 'aichat') { handleSendAIChatMessageRef.current?.(transcriptResult); }
      else if (voiceInputTargetRef.current === 'filename') { handleFilenameSearchChange(transcriptResult); }
    };
    const handleError = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error, event.message);
      if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'not-allowed') {
        showSnackbar(t(I18N_KEYS.VOICE_RECOGNITION_ERROR_DETAIL, {error: event.error}), 'error');
      }
    };
    const handleEnd = () => { setIsListening(false); voiceInputTargetRef.current = null; };

    recognition.addEventListener('result', handleResult as EventListener);
    recognition.addEventListener('error', handleError as EventListener);
    recognition.addEventListener('end', handleEnd);
    return () => {
      recognition.removeEventListener('result', handleResult as EventListener);
      recognition.removeEventListener('error', handleError as EventListener);
      recognition.removeEventListener('end', handleEnd);
      if (recognition && isListening) { recognition.abort(); }
    };
  }, [isListening, t, handleFilenameSearchChange]); 


  const readAllDirectoryEntries = async (directoryReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => {
    return new Promise((resolve, reject) => {
      const entries: FileSystemEntry[] = [];
      const readEntriesBatch = () => {
        directoryReader.readEntries( (batch) => {
            if (batch.length === 0) { resolve(entries); } 
            else { entries.push(...batch); readEntriesBatch(); }
          }, (err) => reject(err)
        );
      };
      readEntriesBatch();
    });
  };
  
  const processDirectoryEntry = async (dirEntry: FileSystemDirectoryEntry, parentId: string | null): Promise<number> => {
    if (!currentUser) return 0;
    let skippedCount = 0;
  
    const newFolder: FileSystemItem = {
      id: 'folder-' + Date.now() + '-' + dirEntry.name.replace(/[^a-zA-Z0-9]/g, '') + '-' + Math.random().toString(36).substring(2, 7),
      name: dirEntry.name, type: FileType.FOLDER, parentId: parentId,
      lastModified: Date.now(), ownerId: currentUser.id, access: AccessLevel.OWNER, size: 0, 
    };
    setAllItems(prev => [...prev, newFolder]);
  
    try {
      const reader = dirEntry.createReader(); const entries = await readAllDirectoryEntries(reader);
      for (const entry of entries) {
        if (entry.isFile) {
          const fileEntry = entry as unknown as FileSystemFileEntry; 
          const success: boolean = await new Promise<boolean>((resolveFile) => {
            fileEntry.file( async (file) => {
                const added = await processAndAddFile(file, newFolder.id); resolveFile(added);
              }, (err) => { console.error(`Error getting file: ${entry.name}`, err); showSnackbar(t(I18N_KEYS.UPLOAD_FILE_GENERIC_ERROR, {fileName: entry.name}), 'error'); resolveFile(false); }
            );
          });
          if (!success) skippedCount++;
        } else if (entry.isDirectory) {
          const subSkipped = await processDirectoryEntry(entry as unknown as FileSystemDirectoryEntry, newFolder.id); 
          skippedCount += subSkipped;
        }
      }
    } catch (error) {
      console.error(`Error processing dir ${dirEntry.name}:`, error);
      showSnackbar(t(I18N_KEYS.UPLOAD_FOLDER_CREATE_ERROR, { folderName: dirEntry.name }), 'error');
      skippedCount++; 
    }
    return skippedCount;
  };


  const handleFileUploadFromDrop = async (dataTransfer: DataTransfer | null) => {
    if (!dataTransfer || !dataTransfer.items || dataTransfer.items.length === 0 || !currentUser || isUploading) return;

    setIsUploading(true);
    let totalSkipped = 0;
    const processingPromises: Promise<void>[] = [];

    for (let i = 0; i < dataTransfer.items.length; i++) {
        const entry = dataTransfer.items[i].webkitGetAsEntry();
        if (entry) {
            if (entry.isFile) {
                const fileEntry = entry as unknown as FileSystemFileEntry;
                processingPromises.push(
                    new Promise<void>((resolve) => {
                        fileEntry.file(
                            async (file) => {
                                const added = await processAndAddFile(file, currentPathId);
                                if (!added) totalSkipped++;
                                resolve();
                            },
                            (err) => {
                                console.error(`Error dropping file: ${entry.name}`, err);
                                showSnackbar(t(I18N_KEYS.UPLOAD_FILE_GENERIC_ERROR, {fileName: entry.name}), 'error');
                                totalSkipped++;
                                resolve();
                            }
                        );
                    })
                );
            } else if (entry.isDirectory) {
                processingPromises.push(
                    processDirectoryEntry(entry as unknown as FileSystemDirectoryEntry, currentPathId).then(skipped => {
                        totalSkipped += skipped;
                    })
                );
            }
        } else { // Fallback for browsers that don't support webkitGetAsEntry well for DataTransfer.files
            const file = dataTransfer.files[i];
             if(file) { // Ensure file is not null
                processingPromises.push(
                    processAndAddFile(file, currentPathId).then(success => {
                        if (!success) totalSkipped++;
                    })
                );
            }
        }
    }

    try {
        await Promise.all(processingPromises);
    } catch (error) {
        console.error("Error during D&D file processing:", error);
        showSnackbar(t(I18N_KEYS.UPLOAD_FILE_GENERIC_ERROR, {fileName: "dragged items"}), 'error');
    } finally {
        if (totalSkipped > 0) {
            showSnackbar(t(I18N_KEYS.UPLOAD_COMPLETED_WITH_SKIPS, { skippedCount: totalSkipped }), 'error');
        }
        setIsUploading(false);
    }
};
  
  const sidebarNavItems = [
    { id: 'storage', labelKey: 'データ保存箱', icon: <Icons.folderSpecial className="w-5 h-5" /> }, 
  ];
  const activeNavItemId = 'storage'; 

  const currentFolderName = filenameSearchTerm 
    ? t('searchResultsHeading', { searchTerm: filenameSearchTerm}) // Use translation for search results
    : (breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length -1].name : t(I18N_KEYS.MY_DRIVE));


  if (currentView === View.LOGIN || !currentUser) {
    return (
        <>
            <LoginScreen 
                onLogin={handleLogin} 
                onGoogleLogin={() => showSnackbar(t(I18N_KEYS.GOOGLE_SIGN_IN_DEMO), 'info')} 
            />
            {snackbar && (<Snackbar key={snackbar.key} message={snackbar.message} type={snackbar.type} isOpen={!!snackbar} onClose={closeSnackbar}/>)}
        </>
    );
  }

  const toggleSortDirection = () => {
    setSortConfig(prev => ({
        ...prev,
        direction: prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <div className="flex h-screen antialiased text-slate-900 bg-white dark:text-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="w-60 bg-[#006C4A] text-white flex flex-col fixed inset-y-0 left-0 z-30 shadow-lg">
            <div className="p-4 border-b border-green-700 flex justify-between items-center">
            <span className="text-xl font-semibold">マンション管理</span>
            <Button variant="icon" onClick={() => setIsSidebarOpen(false)} className="text-white hover:bg-green-800">
                <Icons.close />
            </Button>
            </div>
            <nav className="flex-grow p-2 space-y-1">
            {sidebarNavItems.map(item => (
                <button
                key={item.id}
                onClick={() => {
                    if (item.id === 'storage') {
                    setCurrentPathId(null);
                    setFilenameSearchTerm('');
                    setSelectedItem(null);
                    } else {
                    showSnackbar(`"${item.labelKey}" へのナビゲーションは実装されていません。`, 'info'); // Hardcoded Japanese
                    }
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                            ${item.id === activeNavItemId 
                                ? 'bg-[#00875A] text-white' 
                                : 'text-green-100 hover:bg-green-800 hover:text-white'}`}
                >
                {item.icon}
                <span>{item.labelKey}</span>
                </button>
            ))}
            </nav>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-60' : 'ml-0'}`}>
        <header className={`p-3 border-b ${ThemeColors.outline} shadow-sm sticky top-0 z-20 bg-white dark:bg-slate-800 flex items-center justify-end space-x-4`}>
            {!isSidebarOpen && (
                <Button 
                    variant="icon" 
                    onClick={() => setIsSidebarOpen(true)} 
                    className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 mr-auto" /* Changed: Added mr-auto */
                    srText="サイドバーを開く" // Hardcoded Japanese
                >
                    <Icons.menu />
                </Button>
            )}
             <span className='text-sm text-slate-700 dark:text-slate-200 mr-2'>{currentUser?.email || 'User'}</span> {/* Moved and styled */}
            {currentUser && <UserProfile user={currentUser} onLogout={handleLogout} />}
        </header>
        
        <div className={`p-4 border-b ${ThemeColors.outline} flex justify-between items-center bg-white dark:bg-slate-800`}>
            <div className="flex items-center space-x-2">
                <Icons.folderSpecial className="w-7 h-7 text-green-600" /> 
                <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">データ保存箱</h1>
            </div>
            <div className="flex items-center space-x-2">
                <div className="relative w-48"> {/* Container for search input and icon */}
                    <div className={`absolute left-3 top-1/2 -translate-y-[calc(50%+1px)] text-slate-400 dark:text-slate-500`} aria-hidden="true"> {/* Adjusted icon position & color */}
                        <Icons.search className="w-4 h-4" />
                    </div>
                    <Input
                        type="text"
                        placeholder="検索..." // Hardcoded Japanese
                        value={filenameSearchTerm}
                        onChange={(e) => handleFilenameSearchChange(e.target.value)}
                        className="!py-2 !text-sm pl-9 pr-3 h-9 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 focus:border-indigo-500" // Changed background and text colors
                        srLabel="ファイル名で検索" // Hardcoded Japanese
                    />
                </div>
                <Button 
                    variant="secondary" 
                    onClick={() => setIsCreateFolderModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 h-9"
                >
                    +
                </Button>
                {selectedItem && selectedItem.type === FileType.FILE && selectedItem.content && (
                     <Button 
                        variant="icon" 
                        onClick={() => handleDownloadItem(selectedItem)}
                        className="bg-teal-500 hover:bg-teal-600 text-white !p-0 w-9 h-9 flex items-center justify-center"
                        title={t(I18N_KEYS.DOWNLOAD_BUTTON_TOOLTIP)}
                        srText={t(I18N_KEYS.DOWNLOAD_BUTTON_TOOLTIP) + (selectedItem ? ' ' + selectedItem.name : '')}
                    >
                        <Icons.download className="w-4 h-4"/>
                    </Button>
                )}
                {selectedItem && (
                     <Button 
                        variant="icon" 
                        onClick={() => handleDeleteItem(selectedItem)}
                        className="bg-red-600 hover:bg-red-700 text-white !p-0 w-9 h-9 flex items-center justify-center"
                        title={t(I18N_KEYS.DELETE_BUTTON_TOOLTIP)}
                        srText={t(I18N_KEYS.DELETE_BUTTON_TOOLTIP) + (selectedItem ? ' ' + selectedItem.name : '')}
                        disabled={deletingItemId === selectedItem.id}
                    >
                        <Icons.delete className="w-4 h-4"/>
                    </Button>
                )}
            </div>
        </div>


        <main 
          className={`flex-grow p-4 overflow-y-auto custom-scrollbar relative bg-gray-50 dark:bg-slate-900 ${isUploading ? 'opacity-70 cursor-wait' : ''}`}
        >
           {isUploading && (
            <div className="absolute inset-0 bg-slate-400 bg-opacity-30 flex flex-col items-center justify-center pointer-events-auto z-30 rounded-lg backdrop-blur-sm">
              <Icons.spinner className={`w-16 h-16 ${ThemeColors.onPrimaryContainer} mb-2`} />
              <p className={`text-lg font-semibold ${ThemeColors.onPrimaryContainer}`}>{t(I18N_KEYS.SUMMARY_LOADING)}</p> 
            </div>
          )}
          
          <div className={`p-3 mb-4 rounded-md bg-slate-100 dark:bg-slate-800`}>
            <div className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                <Icons.folder className="w-5 h-5 mr-2 text-yellow-500" />
                <span>現在選択のフォルダ</span>
            </div>
            <button 
                onClick={() => { setCurrentPathId(null); handleFilenameSearchChange(''); setSelectedItem(null); }} 
                className="mt-1 text-lg font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
                {filenameSearchTerm ? t(I18N_KEYS.MY_DRIVE) : currentFolderName} 
            </button>
             {filenameSearchTerm && <div className="text-xs text-slate-500">{t('searchResultsHeading', { searchTerm: filenameSearchTerm })}. <button onClick={() => handleFilenameSearchChange('')} className='underline'>{t('clearButton', {defaultValue: 'Clear search'})}</button></div>}

             {!filenameSearchTerm && breadcrumbs.length > 0 && (
                <div className='text-xs text-slate-500 mt-1'>
                    <button onClick={() => {setCurrentPathId(null); handleFilenameSearchChange(''); setSelectedItem(null);}} className="hover:underline">{t(I18N_KEYS.MY_DRIVE)}</button>
                    {breadcrumbs.map((b, i) => (
                        <React.Fragment key={b.id}>
                            <span className='mx-1'>/</span>
                            {i === breadcrumbs.length - 1 ? (
                                <span>{b.name}</span>
                            ) : (
                                <button onClick={() => {setCurrentPathId(b.id); setSelectedItem(null);}} className="hover:underline">{b.name}</button>
                            )}
                        </React.Fragment>
                    ))}
                </div>
             )}
          </div>
          
          <FileUploadArea 
            onFileUpload={handleFileUpload}
            onFileUploadFromDrop={handleFileUploadFromDrop}
            isUploading={isUploading}
            targetDirectoryName={currentFolderName}
            className="mb-4"
          />

          <div className="flex justify-between items-center mb-3 text-sm text-slate-600 dark:text-slate-400">
            <Button 
                variant="secondary"
                onClick={toggleSortDirection} 
                className="!p-1 !text-xs !font-normal !bg-transparent hover:!bg-slate-200 dark:hover:!bg-slate-700 flex items-center"
                iconLeft={sortConfig.direction === 'asc' ? <Icons.arrowUpward className="w-3 h-3 text-xs transform -translate-y-px"/> : <Icons.arrowDownward className="w-3 h-3 text-xs transform -translate-y-px"/>}
                srText={t(I18N_KEYS.TOGGLE_SORT_ORDER_ARIA)}
            >
                [表示順] {t(I18N_KEYS.SORT_BY_NAME)}: {sortConfig.direction === 'asc' ? t(I18N_KEYS.SORT_ORDER_ASC) : t(I18N_KEYS.SORT_ORDER_DESC)}
            </Button>
            <span>表示件数: {displayedItems.length}件</span>
          </div>

          <FileList 
            items={displayedItems} 
            selectedItemId={selectedItem?.id || null}
            deletingItemId={deletingItemId}
            onSelectItem={handleSelectItem}
            onOpenItem={handleOpenItem}
            onSummarizeItem={handleSummarizeItem} 
            onDeleteItem={handleDeleteItem}     
            onDownloadItem={handleDownloadItem} 
            showItemActions={false} 
          />

          <div className="mt-4 flex justify-end">
            <button className="px-3 py-1 border border-slate-300 rounded-md text-sm bg-white dark:bg-slate-700 dark:border-slate-600">1</button>
          </div>

        </main>
      </div>

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
      {rawContentFile && (
        <RawContentViewerModal
          isOpen={isRawContentViewerOpen}
          onClose={() => { setIsRawContentViewerOpen(false); setRawContentFile(null); }}
          file={rawContentFile}
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
          onClose={() => { setIsConfirmModalOpen(false); setItemToConfirmDelete(null); }}
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
      {snackbar && ( <Snackbar key={snackbar.key} message={snackbar.message} type={snackbar.type} isOpen={!!snackbar} onClose={closeSnackbar} /> )}
    </div>
  );
};

export default App;
