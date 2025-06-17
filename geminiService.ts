

import { GoogleGenAI, GenerateContentResponse, Part, Chat, Content } from "@google/genai";
import { SummaryResult, FileSystemItem, FileType } from "./types";
// import { SUMMARIZABLE_MIME_TYPES } from "./constants"; // 個別要約機能削除のため不要

// Initialize directly using process.env.API_KEY.
// This key will NOT be used by the frontend chat/summary if backend is implemented.
// It might still be used if USE_LOCAL_FALLBACK in apiService is true for other AI features,
// or if any geminiService function is still called directly by frontend.
if (!process.env.API_KEY) {
  console.warn("CRITICAL: API_KEY environment variable is not set. Frontend direct Gemini API calls (if any are left or for local fallback) will fail. Ensure it is properly configured.");
}
const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

// const TEXT_MODEL = 'gemini-2.5-flash-preview-04-17'; // No longer used directly in frontend for chat/summary
// const MAX_CONTEXT_CHARS = 15000; // Context formatting is now backend's responsibility

// Individual file summarization logic is removed as per user request.
// If needed for other purposes, it can be reinstated or managed by backend.
/*
export async function summarizeText(
  fileContent: string, 
  mimeType: string,
  language: 'en' | 'ja'
): Promise<SummaryResult | null> {
  // ... (previous implementation) ...
}
*/

// AI Chat creation and message sending logic is moved to backend.
// These functions are no longer called by App.tsx.
/*
function getSystemInstructionText(language: 'en' | 'ja'): string {
  // ... (previous implementation) ...
}

export function createAIChat(language: 'en' | 'ja'): Chat | null {
  if (!ai) {
    console.warn("AI Chat creation skipped: Gemini API client not initialized (API_KEY missing?).");
    return null;
  }
  const systemInstructionText = getSystemInstructionText(language);
  return ai.chats.create({
    model: TEXT_MODEL,
    config: {
      systemInstruction: systemInstructionText 
    }
  });
}

function formatMultipleFileContentsForAI(files: FileSystemItem[], language: 'en' | 'ja'): string {
  // ... (previous implementation, now backend's responsibility) ...
}


export async function sendAIChatMessage(
  chat: Chat | null, // Chat can be null if AI client not initialized
  userMessage: string, 
  currentFiles: FileSystemItem[], // This context is now built by backend
  language: 'en' | 'ja'
): Promise<string | null> {
  // ... (previous implementation, now backend's responsibility) ...
}
*/

// If there are other utility functions related to Gemini that are purely frontend
// and don't involve sending messages or summarizing, they can remain here.
// For now, this file becomes mostly empty as core AI logic is moved to backend.
console.log("geminiService.ts: Core AI functionalities (chat, summary) are expected to be handled by the backend.");

