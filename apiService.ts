

import { FileSystemItem, FileType, User, AIChatMessage, Content } from './types';
import { ALLOWED_UPLOAD_EXTENSIONS, KNOWN_EXTENSION_MIME_TYPES } from './constants';

// falseに設定して、実際のバックエンドAPIと通信するようにします。
const USE_LOCAL_FALLBACK = false; 

// バックエンドAPIをAPI Gatewayでデプロイした実際のURLに置き換えます。
const API_BASE_URL = 'https://civdr9blr4.execute-api.ap-northeast-1.amazonaws.com/dev'; 

// --- ローカルフォールバック用のデータストアとロジック (USE_LOCAL_FALLBACK = false の場合は使用されません) ---
let localFileSystemStore: FileSystemItem[] = [];
let currentUserForStore: User | null = null; 

const generateId = (prefix: string, name: string = ''): string => {
  return `${prefix}-${Date.now()}-${name.replace(/[^a-zA-Z0-9]/g, '')}-${Math.random().toString(36).substring(2, 9)}`;
};

const getFileExtension = (filename: string): string => {
    return filename.substring(filename.lastIndexOf('.')).toLowerCase();
};

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]); 
      } else {
        reject(new Error('Failed to read file as base64 string.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};


// --- 認証とAPIリクエスト (バックエンド接続モード用) ---
const getAuthToken = async (): Promise<string | null> => {
  if (USE_LOCAL_FALLBACK) return null;
  return 'DUMMY_AUTH_TOKEN_REPLACE_WITH_REAL_ONE'; 
};

const apiRequest = async <T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', // Added PATCH
  body?: any
): Promise<T> => {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token && !USE_LOCAL_FALLBACK) { 
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    console.log(`[API Request] ${method} ${API_BASE_URL}${endpoint}`, body);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'API request failed with status: ' + response.status, code: response.status }));
      console.error(`[API Error] ${method} ${API_BASE_URL}${endpoint}: ${response.status}`, errorData);
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    if (response.status === 204) { 
        return null as T;
    }
    const responseData = await response.json();
    console.log(`[API Response] ${method} ${API_BASE_URL}${endpoint}:`, responseData);
    return responseData;
  } catch (error) {
    console.error(`API request to ${method} ${endpoint} failed:`, error);
    throw error;
  }
};

// --- API関数群 ---

export const getFileSystemItems = async (parentId: string | null): Promise<FileSystemItem[]> => {
  if (USE_LOCAL_FALLBACK) {
    console.log(`[Local] Fetching items for parentId: ${parentId}`);
    await new Promise(resolve => setTimeout(resolve, 200)); 
    return localFileSystemStore.filter(item => item.parentId === parentId && item.ownerId === currentUserForStore?.id);
  }
  const endpoint = parentId ? `/files?parentId=${parentId}` : '/files?root=true';
  return apiRequest<FileSystemItem[]>(endpoint, 'GET');
};

export const getAllFileSystemItems = async (): Promise<FileSystemItem[]> => {
  if (USE_LOCAL_FALLBACK) {
    console.log(`[Local] Fetching all items`);
    await new Promise(resolve => setTimeout(resolve, 200));
    return localFileSystemStore.filter(item => item.ownerId === currentUserForStore?.id);
  }
  return apiRequest<FileSystemItem[]>('/files/all', 'GET');
};

export const uploadFile = async (
  file: File,
  parentId: string | null,
  t: (key: string, params?: Record<string, string | number>) => string 
): Promise<FileSystemItem | { error: string }> => {
  const fileName = file.name;
  const fileExtension = getFileExtension(fileName);

  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(fileExtension)) {
    const errorMessage = t('uploadFileInvalidExtension', {
        fileName: file.name,
        fileExtension: fileExtension || "none",
    });
    return { error: errorMessage };
  }
  
  let effectiveMimeType = file.type || KNOWN_EXTENSION_MIME_TYPES[fileExtension] || 'application/octet-stream';
  if (KNOWN_EXTENSION_MIME_TYPES[fileExtension]) {
    effectiveMimeType = KNOWN_EXTENSION_MIME_TYPES[fileExtension];
  }

  if (USE_LOCAL_FALLBACK) {
    console.log(`[Local] Uploading file "${file.name}" to parentId: ${parentId}`);
    if (!currentUserForStore) return { error: "User not logged in for local fallback." };
    try {
      const base64Content = await readFileAsBase64(file);
      const newItem: FileSystemItem = {
        id: generateId('file', file.name),
        name: file.name,
        type: FileType.FILE,
        parentId: parentId,
        content: base64Content, 
        mimeType: effectiveMimeType,
        lastModified: Date.now(),
        size: file.size,
        ownerId: currentUserForStore.id,
      };
      localFileSystemStore.push(newItem);
      await new Promise(resolve => setTimeout(resolve, 500));
      return newItem;
    } catch (error) {
      console.error("[Local] Error reading file for upload:", error);
      return { error: t('uploadFileGenericError', {fileName: file.name}) };
    }
  }

  try {
    const presignedUrlResponse = await apiRequest<{ uploadUrl: string, fileId: string, s3Key: string }>(
      '/files/initiate-upload', 
      'POST',
      { name: file.name, mimeType: effectiveMimeType, size: file.size, parentId: parentId }
    );

    const s3UploadResponse = await fetch(presignedUrlResponse.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': effectiveMimeType }, 
    });

    if (!s3UploadResponse.ok) {
      throw new Error(`S3 upload failed: ${s3UploadResponse.statusText}`);
    }
    return await apiRequest<FileSystemItem>(
      `/files/complete-upload`, 
      'POST',
      { 
        fileId: presignedUrlResponse.fileId, 
        name: file.name, 
        mimeType: effectiveMimeType, 
        size: file.size, 
        parentId: parentId, 
        s3Key: presignedUrlResponse.s3Key 
      }
    );
  } catch (error) {
    console.error("Error during file upload to backend:", error);
    return { error: (error instanceof Error ? error.message : t('uploadFileGenericError', { fileName: file.name })) };
  }
};

export const createFolder = async (name: string, parentId: string | null): Promise<FileSystemItem | { error: string }> => {
  if (USE_LOCAL_FALLBACK) {
    console.log(`[Local] Creating folder "${name}" in parentId: ${parentId}`);
    if (!currentUserForStore) return { error: "User not logged in for local fallback." };
    const newFolder: FileSystemItem = {
      id: generateId('folder', name),
      name,
      type: FileType.FOLDER,
      parentId,
      lastModified: Date.now(),
      ownerId: currentUserForStore.id,
    };
    localFileSystemStore.push(newFolder);
    await new Promise(resolve => setTimeout(resolve, 100));
    return newFolder;
  }
  try {
    return await apiRequest<FileSystemItem>('/folders', 'POST', { name, parentId });
  } catch (error) {
    console.error("Error creating folder via API:", error);
    return { error: (error instanceof Error ? error.message : "Folder creation failed") };
  }
};

export const deleteFileSystemItem = async (itemId: string): Promise<{ success: boolean; deletedIds?: string[], error?: string }> => {
  if (USE_LOCAL_FALLBACK) {
    console.log(`[Local] Deleting item with id: ${itemId}`);
    const itemToDelete = localFileSystemStore.find(item => item.id === itemId);
    if (!itemToDelete) return { success: false, error: "Item not found." };
    
    let idsToDelete = [itemId];
    if (itemToDelete.type === FileType.FOLDER) {
      const collectChildrenRecursive = (folderId: string): string[] => {
        let childrenIds: string[] = [];
        const directChildren = localFileSystemStore.filter(item => item.parentId === folderId);
        for (const child of directChildren) {
          childrenIds.push(child.id);
          if (child.type === FileType.FOLDER) {
            childrenIds = childrenIds.concat(collectChildrenRecursive(child.id));
          }
        }
        return childrenIds;
      };
      idsToDelete = idsToDelete.concat(collectChildrenRecursive(itemId));
    }
    
    localFileSystemStore = localFileSystemStore.filter(item => !idsToDelete.includes(item.id));
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true, deletedIds: idsToDelete };
  }
  try {
    await apiRequest<void>(`/files/${itemId}`, 'DELETE'); 
    return { success: true, deletedIds: [itemId] }; 
  } catch (error) {
    console.error("Error deleting item via API:", error);
    return { success: false, error: (error instanceof Error ? error.message : "Deletion failed") };
  }
};

export const downloadFileContent = async (item: FileSystemItem): Promise<{ blob: Blob; name: string } | { error: string }> => {
  if (item.type === FileType.FOLDER) return { error: "Cannot download a folder." };

  if (USE_LOCAL_FALLBACK) {
    console.log(`[Local] Downloading item: ${item.name}`);
    if (!item.content || !item.mimeType) return { error: "File content or mimeType missing in local store."};
    try {
        const blob = base64ToBlob(item.content, item.mimeType);
        await new Promise(resolve => setTimeout(resolve, 100));
        return { blob, name: item.name };
    } catch (e) {
        console.error("[Local] Error creating blob for download:", e);
        return { error: "Failed to prepare local file for download." };
    }
  }
  
  try {
    const response = await apiRequest<{ downloadUrl: string }>(`/files/${item.id}/download-url`, 'GET');
    const fileResponse = await fetch(response.downloadUrl);
    if (!fileResponse.ok) throw new Error(`File download failed: ${fileResponse.statusText}`);
    const blob = await fileResponse.blob();
    return { blob, name: item.name };
  } catch (error) {
    console.error("Error downloading file via API:", error);
    return { error: (error instanceof Error ? error.message : "Error preparing file for download.") };
  }
};

// AIチャット機能をバックエンドAPI経由で呼び出す関数
export const sendChatQueryToBackend = async (
  userMessage: string,
  fileContextIds: string[], // 参照するファイルのIDリスト
  chatHistory: Content[], // Gemini APIのContent型に合わせたチャット履歴
  language: 'en' | 'ja'
): Promise<string | null> => {
  if (USE_LOCAL_FALLBACK) {
    console.warn("[Local Fallback] AI Chat with backend is not available in local fallback mode. Returning generic response.");
    return language === 'ja' ? "ローカルフォールバックモードではAIチャットはバックエンドと連携できません。" : "AI Chat with backend is not available in local fallback mode.";
  }
  try {
    const response = await apiRequest<{ reply: string }>(
      '/chat', // 新しいAIチャット用APIエンドポイント
      'POST',
      {
        userMessage,
        fileContextIds,
        chatHistory,
        language,
      }
    );
    return response.reply;
  } catch (error) {
    console.error("Error sending chat query to backend API:", error);
    const errorMessage = error instanceof Error ? error.message : "AI Chat request failed.";
    return language === 'ja' ? `AIチャットエラー: ${errorMessage}` : `AI Chat Error: ${errorMessage}`;
  }
};


export const setCurrentUserForLocalFallback = (user: User | null) => {
    if (USE_LOCAL_FALLBACK) {
        console.log("[Local Fallback] Setting current user for local store:", user);
        currentUserForStore = user;
        if (!user) {
            localFileSystemStore = []; 
        }
    }
};

console.log("[ApiService] Initialized. USE_LOCAL_FALLBACK =", USE_LOCAL_FALLBACK, "API_BASE_URL =", API_BASE_URL);