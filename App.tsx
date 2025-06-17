

// Speech API 型宣言
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
  readonly interpretation?: any; 
  readonly emma?: any; 
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
  grammars: any; 
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  serviceURI?: string; 

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

declare var SpeechRecognition: SpeechRecognitionStatic | undefined;
declare var webkitSpeechRecognition: SpeechRecognitionStatic | undefined;


interface FileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
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
  LoginScreen, FileList, /*FilenameSearchBar,*/ DateRangeFilter, /*SummaryModal,*/ CreateFolderModal, Button, 
  UserProfile, BreadcrumbsDisplay, AIChatModal, Snackbar, SelectFilter, ConfirmationModal, RawContentViewerModal,
  FileUploadArea, Input
} from './components';
import { 
    CommonStyles, Icons, ThemeColors, I18N_KEYS, ALLOWED_UPLOAD_EXTENSIONS, /*SUMMARIZABLE_MIME_TYPES,*/
    DOCUMENT_MIME_TYPES, IMAGE_MIME_TYPES_PREFIX, SPREADSHEET_MIME_TYPES, PRESENTATION_MIME_TYPES,
    AUDIO_MIME_TYPES_PREFIX, VIDEO_MIME_TYPES_PREFIX,
    FILE_SIZE_SMALL_MAX, FILE_SIZE_MEDIUM_MAX, FILE_SIZE_LARGE_MAX,
    KNOWN_EXTENSION_MIME_TYPES
} from './constants';
// import { createAIChat, sendAIChatMessage } from './geminiService'; // バックエンド移行のため直接呼び出しは不要に
import * as apiService from './apiService'; 
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

// Debounce utility function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => void;
}


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
    return new Uint8Array(0); 
  }
}

type SnackbarMessage = {
  message: string;
  type: 'success' | 'error' | 'info';
  key: number; 
};


const App: React.FC = () => {
  const { t, language, setLanguage, locale } = useTranslation(); 

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);
  
  const [allItems, setAllItems] = useState<FileSystemItem[]>([]);
  const [currentPathId, setCurrentPathId] = useState<string | null>(null);
  
  const [selectedItem, setSelectedItem] = useState<FileSystemItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  
  const [searchInputText, setSearchInputText] = useState<string>(''); // For immediate input display
  const [debouncedFilenameSearchTerm, setDebouncedFilenameSearchTerm] = useState<string>(''); // For actual filtering/fetching

  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilterOption>('all');
  const [fileSizeFilter, setFileSizeFilter] = useState<FileSizeFilterOption>('all');
  
  // Individual file summary related states and functions are removed/commented out
  // const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  // const [summaryContent, setSummaryContent] = useState<SummaryResult | null>(null);
  // const [isSummarizing, setIsSummarizing] = useState(false);

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);

  const [isAIChatModalOpen, setIsAIChatModalOpen] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<AIChatMessage[]>([]);
  const [isSendingAIChatMessage, setIsSendingAIChatMessage] = useState(false);
  // aiChatInstanceRef is no longer needed as chat state is managed by backend
  // const aiChatInstanceRef = useRef<Chat | null>(null);
  const [aiChatHistory, setAiChatHistory] = useState<Content[]>([]);


  const [isListening, setIsListening] = useState(false);
  const voiceInputTargetRef = useRef<'filename' | 'aichat' | null>(null);
  
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);


  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToConfirmDelete, setItemToConfirmDelete] = useState<FileSystemItem | null>(null);

  const [isDownloadConfirmModalOpen, setIsDownloadConfirmModalOpen] = useState(false); // New state
  const [itemToConfirmDownload, setItemToConfirmDownload] = useState<FileSystemItem | null>(null); // New state


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
  
  const commitSearchTerm = useCallback(
    debounce((term: string) => {
      setDebouncedFilenameSearchTerm(term);
    }, 500), // 500ms delay
    [] 
  );

  const handleSearchInputChange = (term: string) => {
    setSearchInputText(term);
    commitSearchTerm(term);
  };


  const fetchItems = useCallback(async (_pathId: string | null) => { 
    setIsLoadingItems(true);
    showSnackbar(t('summaryLoading'), 'info'); // Generic loading message
    try {
      // Always fetch items for the current path.
      // Filtering by debouncedFilenameSearchTerm will happen client-side in displayedItems.
      const items = await apiService.getFileSystemItems(_pathId);
      setAllItems(items);
      showSnackbar("ファイルリストの読み込み完了", "success");
    } catch (error) {
      console.error("Failed to fetch items:", error);
      const errorMessage = error instanceof Error ? error.message : t('summaryError'); 
      showSnackbar(`ファイル取得エラー: ${errorMessage}`, 'error'); 
    } finally {
      setIsLoadingItems(false);
    }
  }, [t]); // debouncedFilenameSearchTerm removed from dependencies


  useEffect(() => {
    if (currentUser && currentView === View.FILE_EXPLORER) {
      fetchItems(currentPathId);
    }
  }, [currentUser, currentView, currentPathId, fetchItems]); // debouncedFilenameSearchTerm removed


  useEffect(() => {
    if (!currentUser) {
      setAllItems([]);
      apiService.setCurrentUserForLocalFallback(null); 
      // aiChatInstanceRef.current = null;  // No longer needed
      setAiChatMessages([]);
      setAiChatHistory([]);
    } else {
      apiService.setCurrentUserForLocalFallback(currentUser); 
      // aiChatInstanceRef.current = createAIChat('ja'); // No longer created in frontend
      setAiChatMessages([]); 
      setAiChatHistory([]); 
    }
  }, [currentUser]); 


  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentView(View.FILE_EXPLORER);
    setCurrentPathId(null); 
    setSelectedItem(null);
    setSearchInputText(''); // Clear search input
    setDebouncedFilenameSearchTerm(''); // Clear debounced search term
    setStartDateFilter('');
    setEndDateFilter('');
    setFileTypeFilter('all');
    setFileSizeFilter('all');
    setIsSidebarOpen(true); 
    setSortConfig({ key: 'name', direction: 'asc' }); 
  };

  const handleLogout = () => {
    setCurrentUser(null); 
    setCurrentView(View.LOGIN);
  };

  const handleSelectItem = (item: FileSystemItem) => {
    setSelectedItem(item);
  };

  const handleOpenItem = async (item: FileSystemItem) => {
    if (item.type === FileType.FOLDER) {
      setCurrentPathId(item.id);
      setSelectedItem(null); 
      handleSearchInputChange(''); // Clear search when opening folder
    } else { // File
      setItemToConfirmDownload(item);
      setIsDownloadConfirmModalOpen(true);
    }
  };
  
 const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentUser || isUploading) return;

    setIsUploading(true);
    showSnackbar(t('summaryLoading'), 'info'); 
    let skippedCount = 0;
    const processingPromises: Promise<void>[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isDirectoryPlaceholder = file.type === "" && file.size % 4096 === 0; 
        if (isDirectoryPlaceholder) { 
            showSnackbar(t(I18N_KEYS.UPLOAD_FOLDER_DRAGGED_DIRECTLY), 'info'); 
            skippedCount++;
            continue;
        }
        
        processingPromises.push(
          apiService.uploadFile(file, currentPathId, t).then(result => {
            if ('error' in result) {
              showSnackbar(result.error, 'error');
              skippedCount++;
            }
          }).catch(err => {
             showSnackbar(err.message || t(I18N_KEYS.UPLOAD_FILE_GENERIC_ERROR, {fileName: file.name}), 'error');
             skippedCount++;
          })
        );
    }

    try {
        await Promise.all(processingPromises);
        await fetchItems(currentPathId); 
        showSnackbar("アップロード完了", "success");
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


  const handleCreateFolder = async (name: string) => {
    if (currentUser) {
      setIsUploading(true); 
      showSnackbar("フォルダを作成中...", "info");
      const result = await apiService.createFolder(name, currentPathId);
      if ('error' in result) {
        showSnackbar(result.error, 'error');
      } else if (result) {
        await fetchItems(currentPathId); 
        showSnackbar(`フォルダ "${name}" を作成しました`, "success");
      }
      setIsUploading(false);
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
    showSnackbar(`"${itemToConfirmDelete.name}" を削除中...`, "info");

    const result = await apiService.deleteFileSystemItem(itemToConfirmDelete.id);

    if (result.success) {
      if (selectedItem?.id === itemToConfirmDelete.id || (itemToConfirmDelete.type === FileType.FOLDER && selectedItem?.parentId === itemToConfirmDelete.id) || (result.deletedIds?.includes(selectedItem?.id || ''))) {
        setSelectedItem(null);
      }
      
      const newPathId = (currentPathId === itemToConfirmDelete.id && itemToConfirmDelete.type === FileType.FOLDER) 
                        ? allItems.find(i => i.id === itemToConfirmDelete.id)?.parentId 
                        : currentPathId;
      
      if (newPathId !== currentPathId) {
          setCurrentPathId(newPathId); 
      } else {
          await fetchItems(currentPathId); 
      }
      showSnackbar(`"${itemToConfirmDelete.name}" を削除しました`, "success");
    } else {
      showSnackbar(result.error || t(I18N_KEYS.DELETE_ERROR_GENERIC, { itemName: itemToConfirmDelete.name }), 'error');
    }

    setDeletingItemId(null);
    setItemToConfirmDelete(null);
  };

  // Individual file summary function is removed
  // const handleSummarizeItem = async (itemToSummarize: FileSystemItem) => { ... };

  const handleDownloadItem = async (itemToDownload: FileSystemItem) => {
    if (itemToDownload.type === FileType.FOLDER) return;
    showSnackbar(`${itemToDownload.name} をダウンロード準備中...`, "info");
    setIsLoadingItems(true);
    const result = await apiService.downloadFileContent(itemToDownload);
    setIsLoadingItems(false);

    if ('error' in result) {
      showSnackbar(result.error || t(I18N_KEYS.DOWNLOAD_FILE_CONTENT_UNAVAILABLE, { fileName: itemToDownload.name }), 'error');
    } else if (result) {
      const { blob, name } = result;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      showSnackbar(`${name} のダウンロード完了`, "success");
    }
  };

  const handleConfirmDownload = () => {
    if (itemToConfirmDownload) {
      handleDownloadItem(itemToConfirmDownload);
    }
    setIsDownloadConfirmModalOpen(false);
    setItemToConfirmDownload(null);
  };

  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    const path: BreadcrumbItem[] = [];
    let tempCurrentFolderId = currentPathId;
    const allFolders = allItems.filter(i => i.type === FileType.FOLDER); 

    while (tempCurrentFolderId) {
      const folder = allFolders.find(item => item.id === tempCurrentFolderId);
      if (folder) {
        path.unshift({ id: folder.id, name: folder.name });
        tempCurrentFolderId = folder.parentId;
      } else {
        tempCurrentFolderId = null; 
      }
    }
    return path;
  }, [currentPathId, allItems]);
  

 const displayedItems = useMemo(() => {
    let itemsToDisplay = allItems; 
    if (debouncedFilenameSearchTerm) { // Use debounced term for filtering
        itemsToDisplay = itemsToDisplay.filter(item => 
            item.name.toLowerCase().includes(debouncedFilenameSearchTerm.toLowerCase())
        );
    } else {
        itemsToDisplay = itemsToDisplay.filter(item => item.parentId === currentPathId);
    }
    
    return itemsToDisplay.sort((a, b) => { 
        if (a.type === FileType.FOLDER && b.type === FileType.FILE) return -1;
        if (a.type === FileType.FILE && b.type === FileType.FOLDER) return 1;

        let valA: string | number = '';
        let valB: string | number = '';

        if (sortConfig.key === 'name') {
            valA = (a.name || '').toString().toLowerCase();
            valB = (b.name || '').toString().toLowerCase();
        } else if (sortConfig.key === 'lastModified') {
            valA = a.lastModified || 0;
            valB = b.lastModified || 0;
        } else if (sortConfig.key === 'size') {
            valA = a.size != null ? a.size : (a.type === FileType.FOLDER ? -1 : 0) ; 
            valB = b.size != null ? b.size : (b.type === FileType.FOLDER ? -1 : 0) ;
        }
        
        let comparison = 0;
        if (valA < valB) {
            comparison = -1;
        } else if (valA > valB) {
            comparison = 1;
        }
        return sortConfig.direction === 'asc' ? comparison : comparison * -1;
    });
}, [allItems, debouncedFilenameSearchTerm, currentPathId, sortConfig]); // Depend on debounced term


  const handleSendAIChatMessageCallback = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessageForUI: AIChatMessage = { role: 'user', text: messageText.trim() };
    // Add user message to UI and history for backend
    setAiChatMessages(prev => [...prev, userMessageForUI]);
    setAiChatHistory(prev => [...prev, { role: 'user', parts: [{ text: messageText.trim() }] }]);
    
    setIsSendingAIChatMessage(true);
    showSnackbar("AIに問い合わせ中...", "info");

    const fileContextIds = displayedItems.filter(item => item.type === FileType.FILE).map(item => item.id);

    // Call backend API for chat
    const responseText = await apiService.sendChatQueryToBackend(
        messageText.trim(),
        fileContextIds,
        aiChatHistory.slice(-10), // Send last 10 turns of history
        language as 'en' | 'ja'
    );
    
    if (responseText) {
      const modelMessageForUI: AIChatMessage = { role: 'model', text: responseText };
      // Add model response to UI and history for backend
      setAiChatMessages(prev => [...prev, modelMessageForUI]);
      setAiChatHistory(prev => [...prev, { role: 'model', parts: [{ text: responseText }] }]);
      showSnackbar("AIからの応答を受信しました", "success");
    } else {
      const errorMessageForUI: AIChatMessage = { role: 'model', text: t(I18N_KEYS.SUMMARY_ERROR) }; // Use a more generic AI error
      setAiChatMessages(prev => [...prev, errorMessageForUI]);
      showSnackbar("AIチャットでエラーが発生しました", "error");
    }
    setIsSendingAIChatMessage(false);
  }, [displayedItems, aiChatHistory, language, t ]); 
  
  const handleSendAIChatMessage = handleSendAIChatMessageCallback;
  const handleSendAIChatMessageRef = useRef(handleSendAIChatMessage);
  useEffect(() => { handleSendAIChatMessageRef.current = handleSendAIChatMessage; }, [handleSendAIChatMessage]);
  
  const startListening = useCallback((target: 'filename' | 'aichat') => {
    if (recognition && !isListening) {
      try {
        voiceInputTargetRef.current = target;
        recognition.lang = 'ja-JP'; 
        recognition.start(); setIsListening(true);
        showSnackbar("音声認識を開始しました...", "info");
      } catch(e) {
        console.error("Speech recognition start error:", e);
        setIsListening(false); 
        showSnackbar(t(I18N_KEYS.VOICE_RECOGNITION_START_ERROR), 'error');
      }
    } else if (!recognition) {
      showSnackbar(t(I18N_KEYS.VOICE_RECOGNITION_NOT_SUPPORTED), 'error');
    }
  }, [isListening, t]);

  const stopListening = useCallback(() => { if (recognition && isListening) { recognition.stop(); showSnackbar("音声認識を停止しました", "info"); } }, [isListening]);

  useEffect(() => {
    if (!recognition) return;
    const handleResult = (event: SpeechRecognitionEvent) => {
      const transcriptResult = event.results[0][0].transcript;
      showSnackbar(`認識結果: ${transcriptResult}`, "success");
      if (voiceInputTargetRef.current === 'aichat') { handleSendAIChatMessageRef.current?.(transcriptResult); }
      else if (voiceInputTargetRef.current === 'filename') { handleSearchInputChange(transcriptResult); } // Use new handler
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
  }, [isListening, t, handleSearchInputChange]); 


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
    showSnackbar(`フォルダ "${dirEntry.name}" を処理中...`, "info");

    const folderCreateResult = await apiService.createFolder(dirEntry.name, parentId);
    let newFolderId: string | null = null;

    if ('error' in folderCreateResult) {
        showSnackbar(folderCreateResult.error, 'error');
        skippedCount++; 
        return skippedCount;
    } else {
        newFolderId = folderCreateResult.id;
    }
  
    try {
      const reader = dirEntry.createReader(); 
      const entries = await readAllDirectoryEntries(reader);

      for (const entry of entries) {
        if (entry.isFile) {
          const fileEntry = entry as unknown as FileSystemFileEntry; 
          const success: boolean = await new Promise<boolean>((resolveFile) => {
            fileEntry.file( async (file) => {
                const uploadResult = await apiService.uploadFile(file, newFolderId, t);
                if ('error' in uploadResult) {
                    showSnackbar(uploadResult.error, 'error');
                    resolveFile(false);
                } else {
                    resolveFile(true);
                }
              }, (err) => { 
                  console.error(`Error getting file from entry: ${entry.name}`, err); 
                  showSnackbar(t(I18N_KEYS.UPLOAD_FILE_GENERIC_ERROR, {fileName: entry.name}), 'error'); 
                  resolveFile(false); 
              }
            );
          });
          if (!success) skippedCount++;
        } else if (entry.isDirectory) {
          const subSkipped = await processDirectoryEntry(entry as unknown as FileSystemDirectoryEntry, newFolderId); 
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
    showSnackbar("ドラッグ＆ドロップされたアイテムを処理中...", "info");
    let totalSkipped = 0;
    const processingPromises: Promise<void>[] = [];

    for (let i = 0; i < dataTransfer.items.length; i++) {
        const item = dataTransfer.items[i]; 
        const entry = item.webkitGetAsEntry(); 
        if (entry) {
            if (entry.isFile) {
                const fileEntry = entry as unknown as FileSystemFileEntry;
                processingPromises.push(
                    new Promise<void>((resolve) => {
                        fileEntry.file(
                            async (file) => {
                                const uploadResult = await apiService.uploadFile(file, currentPathId, t);
                                if ('error' in uploadResult) {
                                    showSnackbar(uploadResult.error, 'error');
                                    totalSkipped++;
                                }
                                resolve();
                            },
                            (err) => {
                                console.error(`Error dropping file from entry: ${entry.name}`, err);
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
        } else { 
            const file = dataTransfer.files[i];
             if(file) { 
                processingPromises.push(
                    apiService.uploadFile(file, currentPathId, t).then(uploadResult => {
                        if ('error' in uploadResult) {
                            showSnackbar(uploadResult.error, 'error');
                            totalSkipped++;
                        }
                    }).catch(err => {
                         showSnackbar(err.message || t(I18N_KEYS.UPLOAD_FILE_GENERIC_ERROR, {fileName: file.name}), 'error');
                         totalSkipped++;
                    })
                );
            }
        }
    }

    try {
        await Promise.all(processingPromises);
        await fetchItems(currentPathId); 
        showSnackbar("ドラッグ＆ドロップ処理完了", "success");
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

  const currentFolderName = debouncedFilenameSearchTerm // Use debounced term
    ? t('searchResultsHeading', { searchTerm: debouncedFilenameSearchTerm}) 
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
  
  const globalLoading = isUploading || isLoadingItems || /*isSummarizing ||*/ !!deletingItemId || isSendingAIChatMessage;


  return (
    <div className="flex h-screen antialiased text-slate-900 bg-white dark:text-slate-50 dark:bg-slate-900">
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
                    handleSearchInputChange(''); // Use new handler
                    setSelectedItem(null);
                    } else {
                    showSnackbar(`"${item.labelKey}" へのナビゲーションは実装されていません。`, 'info'); 
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

      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-60' : 'ml-0'}`}>
        <header className={`p-3 border-b ${ThemeColors.outline} shadow-sm sticky top-0 z-20 bg-white dark:bg-slate-800 flex items-center justify-end space-x-4`}>
            {!isSidebarOpen && (
                <Button 
                    variant="icon" 
                    onClick={() => setIsSidebarOpen(true)} 
                    className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 mr-auto"
                    srText="サイドバーを開く" 
                >
                    <Icons.menu />
                </Button>
            )}
             <span className='text-sm text-slate-700 dark:text-slate-200 mr-2'>{currentUser?.email || 'User'}</span> 
            {currentUser && <UserProfile user={currentUser} onLogout={handleLogout} />}
        </header>
        
        <div className={`p-3 mb-4 rounded-md bg-slate-100 dark:bg-slate-800`}>
            <div className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                <Icons.folder className="w-5 h-5 mr-2 text-yellow-500" />
                <span>現在選択のフォルダ</span>
            </div>
            <button 
                onClick={() => { setCurrentPathId(null); handleSearchInputChange(''); setSelectedItem(null); }} 
                className="mt-1 text-lg font-medium text-blue-600 hover:underline dark:text-blue-400"
                disabled={globalLoading}
            >
                 {debouncedFilenameSearchTerm ? t(I18N_KEYS.MY_DRIVE) : currentFolderName} 
            </button>
             {debouncedFilenameSearchTerm && <div className="text-xs text-slate-500">{t('searchResultsHeading', { searchTerm: debouncedFilenameSearchTerm })}. <button onClick={() => handleSearchInputChange('')} className='underline' disabled={globalLoading}>{t('clearButton', {defaultValue: 'Clear search'})}</button></div>}

             {!debouncedFilenameSearchTerm && breadcrumbs.length > 0 && (
                <div className='text-xs text-slate-500 mt-1'>
                    <button onClick={() => {setCurrentPathId(null); handleSearchInputChange(''); setSelectedItem(null);}} className="hover:underline" disabled={globalLoading}>{t(I18N_KEYS.MY_DRIVE)}</button>
                    {breadcrumbs.map((b, i) => (
                        <React.Fragment key={b.id}>
                            <span className='mx-1'>/</span>
                            {i === breadcrumbs.length - 1 ? (
                                <span>{b.name}</span>
                            ) : (
                                <button onClick={() => {setCurrentPathId(b.id); setSelectedItem(null); handleSearchInputChange('');}} className="hover:underline" disabled={globalLoading}>{b.name}</button>
                            )}
                        </React.Fragment>
                    ))}
                </div>
             )}
          </div>
          
        <div className={`p-4 border-b ${ThemeColors.outline} flex justify-between items-center bg-white dark:bg-slate-800`}>
            <div className="flex items-center space-x-2">
                <Icons.folderSpecial className="w-7 h-7 text-green-600" /> 
                <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">データ保存箱</h1>
            </div>
            <div className="flex items-center space-x-2">
                <div className="relative w-48"> 
                    <div className={`absolute left-3 top-1/2 -translate-y-[calc(50%+1px)] text-slate-400 dark:text-slate-500`} aria-hidden="true"> 
                        <Icons.search className="w-4 h-4" />
                    </div>
                    <Input
                        type="text"
                        placeholder="検索..." 
                        value={searchInputText} // Use immediate input value for display
                        onChange={(e) => handleSearchInputChange(e.target.value)} // Use new handler
                        className="!py-2 !text-sm pl-9 pr-3 h-9 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 focus:border-indigo-500" 
                        srLabel="ファイル名で検索" 
                        disabled={globalLoading}
                    />
                </div>
                <Button 
                    variant="secondary" 
                    onClick={() => setIsCreateFolderModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 h-9"
                    disabled={globalLoading}
                >
                    +
                </Button>
                {selectedItem && selectedItem.type === FileType.FILE && (
                     <Button 
                        variant="icon" 
                        onClick={() => { setItemToConfirmDownload(selectedItem); setIsDownloadConfirmModalOpen(true); }}
                        className="bg-teal-500 hover:bg-teal-600 text-white !p-0 w-9 h-9 flex items-center justify-center"
                        title={t(I18N_KEYS.DOWNLOAD_BUTTON_TOOLTIP)}
                        srText={t(I18N_KEYS.DOWNLOAD_BUTTON_TOOLTIP) + (selectedItem ? ' ' + selectedItem.name : '')}
                        disabled={globalLoading}
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
                        isLoading={deletingItemId === selectedItem.id}
                        disabled={globalLoading && deletingItemId !== selectedItem.id}
                    >
                        {deletingItemId === selectedItem.id ? null : <Icons.delete className="w-4 h-4"/>}
                    </Button>
                )}
            </div>
        </div>


        <main 
          className={`flex-grow p-4 overflow-y-auto custom-scrollbar relative bg-gray-50 dark:bg-slate-900 ${globalLoading ? 'opacity-70 cursor-wait' : ''}`}
        >
           {globalLoading && (
            <div className="absolute inset-0 bg-slate-400 bg-opacity-30 flex flex-col items-center justify-center pointer-events-auto z-30 rounded-lg backdrop-blur-sm">
              <Icons.spinner className={`w-16 h-16 ${ThemeColors.onPrimaryContainer} mb-2`} />
              <p className={`text-lg font-semibold ${ThemeColors.onPrimaryContainer}`}>
                {isUploading ? "アップロード中..." : 
                 isLoadingItems ? "読み込み中..." :
                 // isSummarizing ? t(I18N_KEYS.SUMMARY_LOADING) : // Removed
                 deletingItemId ? "削除中..." :
                 isSendingAIChatMessage ? "AIに送信中..." :
                 "処理中..."}
              </p> 
            </div>
          )}
          
          
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
                disabled={globalLoading}
            >
                [表示順] {t(I18N_KEYS.sortByName)}: {sortConfig.direction === 'asc' ? t(I18N_KEYS.sortOrderAsc) : t(I18N_KEYS.sortOrderDesc)}
            </Button>
            <span>表示件数: {displayedItems.length}件</span>
          </div>

          <FileList 
            items={displayedItems} 
            selectedItemId={selectedItem?.id || null}
            deletingItemId={deletingItemId}
            onSelectItem={handleSelectItem}
            onOpenItem={handleOpenItem}
            // onSummarizeItem={handleSummarizeItem} // Removed
            onDeleteItem={handleDeleteItem}     
            onDownloadItem={handleDownloadItem} // This will be triggered by confirmation modal now
            showItemActions={false} 
          />

          <div className="mt-4 flex justify-end">
            <button className="px-3 py-1 border border-slate-300 rounded-md text-sm bg-white dark:bg-slate-700 dark:border-slate-600" disabled={globalLoading}>1</button>
          </div>

        </main>
      </div>

      <Button
        variant="icon"
        onClick={() => setIsAIChatModalOpen(true)}
        className={`fixed bottom-6 right-6 z-40 !rounded-full ${ThemeColors.secondary} ${ThemeColors.onSecondary} !p-4 shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75`}
        title={t(I18N_KEYS.ASK_AI_BUTTON)}
        srText={t(I18N_KEYS.ASK_AI_BUTTON)}
        disabled={globalLoading}
      >
        <Icons.chat className="w-6 h-6" />
      </Button>

      {/* Individual File Summary Modal is removed 
      {selectedItem && selectedItem.type === FileType.FILE && selectedItem.mimeType && SUMMARIZABLE_MIME_TYPES.includes(selectedItem.mimeType) && (
        <SummaryModal 
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          summary={summaryContent}
          fileName={selectedItem.name}
          isLoading={isSummarizing}
          modalClassName="w-[80vw] max-w-screen-lg"
        />
      )}
      */}
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
      {itemToConfirmDownload && (
        <ConfirmationModal
          isOpen={isDownloadConfirmModalOpen}
          onClose={() => { setIsDownloadConfirmModalOpen(false); setItemToConfirmDownload(null); }}
          onConfirm={handleConfirmDownload}
          title={t(I18N_KEYS.DOWNLOAD_CONFIRM_TITLE)}
          message={t(I18N_KEYS.DOWNLOAD_CONFIRM_MESSAGE, { fileName: itemToConfirmDownload.name })}
          confirmButtonText={t(I18N_KEYS.DOWNLOAD_CONFIRM_BUTTON)}
          confirmButtonVariant="primary"
          isLoading={isLoadingItems} // Use isLoadingItems for download in progress
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
