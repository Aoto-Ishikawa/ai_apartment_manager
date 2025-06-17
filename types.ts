import { Content } from "@google/genai";
export type { Content }; // Export Content type

export enum FileType {
  FILE = 'FILE',
  FOLDER = 'FOLDER',
}

export interface FileSystemItem {
  id: string;
  name: string;
  type: FileType;
  parentId: string | null;
  content?: string; 
  mimeType?: string; 
  lastModified: number; 
  size?: number; 
  ownerId: string;
  access?: AccessLevel; 
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export enum AccessLevel {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export interface SummaryResult {
  text: string;
  bulletPoints: string[];
}

export enum View {
  LOGIN = 'LOGIN',
  FILE_EXPLORER = 'FILE_EXPLORER',
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface AIChatMessage {
  role: 'user' | 'model';
  text: string;
  // Gemini APIは 'parts' を使用しますが、UIでは 'text' に簡略化します
  // Geminiとの履歴のために完全な 'Content' も保存する必要があります
  geminiContent?: Content; 
}

export type FileTypeFilterOption =
  | 'all'
  | 'folders'
  | 'documents'
  | 'images'
  | 'spreadsheets'
  | 'presentations'
  | 'audio'
  | 'video'
  | 'other';

export type FileSizeFilterOption =
  | 'all'
  | 'small' // 1MB未満
  | 'medium' // 1MB - 50MB
  | 'large' // 50MB - 500MB
  | 'huge'; // 500MB超