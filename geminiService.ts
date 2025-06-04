
import { GoogleGenAI, GenerateContentResponse, Part, Chat, Content } from "@google/genai";
import { SummaryResult, FileSystemItem, FileType } from "./types";

// Initialize directly using process.env.API_KEY.
// The prompt states "Assume this variable is pre-configured, valid, and accessible".
if (!process.env.API_KEY) {
  console.error("CRITICAL: API_KEY environment variable is not set. Gemini API calls will fail. Ensure it is properly configured, e.g., in your .env file and made available via Vite configuration.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! }); 

// Updated to allowed model name as per guidelines
const TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';

export async function summarizeText(
  fileContent: string, // これはプレーンテキストまたはbase64エンコードされたデータです
  mimeType: string,
  language: 'en' | 'ja'
): Promise<SummaryResult | null> {
  if (!process.env.API_KEY) {
    console.warn("Summarization skipped: API_KEY is not configured.");
    return { text: "Summarization service unavailable: API key not configured.", bulletPoints: [] };
  }

  const isTextBased = mimeType.startsWith('text/'); // 例: text/plain, text/markdown
  const isSummarizableDocument = [
    'application/pdf', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ].includes(mimeType);

  if (!isTextBased && !isSummarizableDocument) {
    console.warn(`Summarization not supported for MIME type: ${mimeType}`);
    return { text: "Summarization not supported for this file type.", bulletPoints: [] };
  }
  if (!fileContent) {
    console.warn(`No content provided for summarization (MIME type: ${mimeType})`);
     return { text: "No content found in file to summarize.", bulletPoints: [] };
  }


  try {
    const summaryPromptLang = language === 'ja' ? 'このドキュメントを簡潔に要約してください' : 'Summarize this document concisely';
    const bulletPointsPromptLang = language === 'ja' 
      ? 'このドキュメントに基づいて、主要な箇条書きのリスト（3〜5点）を提供してください。JSON配列の文字列として結果を返してください。' 
      : 'Based on this document, provide a list of key bullet points (3-5 points). Return the result as a JSON array of strings.';

    let summaryRequestContents: string | { parts: Part[] };
    let bulletPointsRequestContents: string | { parts: Part[] };

    if (isTextBased) {
      summaryRequestContents = `${summaryPromptLang}:\n\n${fileContent}`;
      bulletPointsRequestContents = `${bulletPointsPromptLang}:\n\n${fileContent}`;
    } else { // PDF、DOCX - fileContentはbase64データです
      const filePart: Part = {
        inlineData: {
          mimeType: mimeType,
          data: fileContent 
        }
      };
      summaryRequestContents = { parts: [filePart, { text: summaryPromptLang }] };
      bulletPointsRequestContents = { parts: [filePart, { text: bulletPointsPromptLang }] };
    }

    const [textResponse, bulletPointsResponse] = await Promise.all([
      ai.models.generateContent({
        model: TEXT_MODEL,
        contents: summaryRequestContents,
      }),
      ai.models.generateContent({
        model: TEXT_MODEL,
        contents: bulletPointsRequestContents,
        config: { responseMimeType: "application/json" } 
      }),
    ]);
    
    const summaryText = textResponse.text;
    let summaryBulletPoints: string[] = [];

    let jsonStr = bulletPointsResponse.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        summaryBulletPoints = parsed.filter(item => typeof item === 'string');
      } else if (parsed && typeof parsed === 'object') {
        // Attempt to find an array of strings within the object
        const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]) && parsed[key].every((item: unknown) => typeof item === 'string'));
        if (arrayKey) {
          summaryBulletPoints = parsed[arrayKey];
        } else {
           // If no suitable array is found, use the stringified JSON as a single bullet point
           summaryBulletPoints = [jsonStr]; 
        }
      } else {
         // If not an array or object, treat the whole response as a single bullet point
         summaryBulletPoints = [jsonStr]; 
      }
    } catch (e) {
      console.error("Failed to parse bullet points JSON:", e, "Raw text:", bulletPointsResponse.text);
      // Fallback for non-JSON or malformed JSON responses
      summaryBulletPoints = bulletPointsResponse.text.split('\n').map(pt => pt.replace(/^- /,'').trim()).filter(pt => pt.length > 0);
    }

    return {
      text: summaryText,
      bulletPoints: summaryBulletPoints.slice(0, 5), // Ensure max 5 bullet points
    };
  } catch (error) {
    console.error("Error summarizing file with Gemini:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during summarization.";
    return { text: `Error during summarization: ${errorMessage}`, bulletPoints: [] };
  }
}

function getSystemInstructionText(language: 'en' | 'ja'): string {
  return language === 'ja' 
    ? `あなたはファイル管理アシスタントです。提供されたファイルリストのコンテキストに基づいて、ユーザーの質問に答えてください。ファイルの内容に関する質問の場合は、その旨を伝え、ファイルを開いて確認するよう促してください。特定のファイル（PDF、DOCX、TXT、MDなど）の内容について尋ねられた場合、そのファイルを要約できることを伝えてください。`
    : `You are a file management assistant. Answer the user's questions based on the provided file list context. If asked about file content, state that you can see file names and types, and suggest the user open the file to check its content. If asked about the content of specific files (like PDF, DOCX, TXT, MD), let them know you can summarize those files.`;
}

export function createAIChat(language: 'en' | 'ja'): Chat {
  const systemInstructionText = getSystemInstructionText(language);
  return ai.chats.create({
    model: TEXT_MODEL,
    config: {
      systemInstruction: systemInstructionText 
    }
  });
}

function formatFileContextForAI(files: FileSystemItem[]): string {
  if (files.length === 0) {
    return "There are no files currently visible or matching the search criteria.";
  }
  const fileContextLimit = 10; // Limit the number of files sent in context for brevity
  let context = "Here is a list of relevant files (name, type, last modified):\n";
  files.slice(0, fileContextLimit).forEach(file => {
    context += `- ${file.name} (${file.type}, ${new Date(file.lastModified).toLocaleDateString()})\n`;
  });
  if (files.length > fileContextLimit) {
    context += `\n...and ${files.length - fileContextLimit} more files.`;
  }
  return context;
}


export async function sendAIChatMessage(
  chat: Chat, 
  userMessage: string, 
  currentFiles: FileSystemItem[],
  language: 'en' | 'ja'
): Promise<string | null> {
  if (!process.env.API_KEY) {
    console.warn("AI Chat message sending skipped: API_KEY is not configured.");
    return language === 'ja' ? "AIチャットサービスは現在利用できません: APIキーが設定されていません。" : "AI Chat service unavailable: API key not configured.";
  }

  const fileContext = formatFileContextForAI(currentFiles);
  const messageTextForModel = `${userMessage}\n\nFile Context:\n${fileContext}`;
    
  try {
    const response = await chat.sendMessage({ message: messageTextForModel });
    return response.text;
  } catch (error) {
    console.error("Error sending message to AI Chat:", error);

    // Check for specific error types if possible, e.g., rate limiting
    if ((error as any)?.message?.includes('429')) { // Basic check for rate limit error
        return language === 'ja' ? "リクエストが多すぎます。しばらくしてからもう一度お試しください。" : "Too many requests. Please try again later.";
    }
    return language === 'ja' ? "AIチャットでエラーが発生しました。" : "An error occurred with the AI chat.";
  }
}
