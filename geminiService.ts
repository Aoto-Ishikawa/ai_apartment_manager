
import { GoogleGenAI, GenerateContentResponse, Part, Chat, Content } from "@google/genai";
import { SummaryResult, FileSystemItem, FileType } from "./types";
import { SUMMARIZABLE_MIME_TYPES } from "./constants"; // 定数からインポート

// Initialize directly using process.env.API_KEY.
// The prompt states "Assume this variable is pre-configured, valid, and accessible".
if (!process.env.API_KEY) {
  console.error("CRITICAL: API_KEY environment variable is not set. Gemini API calls will fail. Ensure it is properly configured, e.g., in your .env file and made available via Vite configuration.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! }); 

// Updated to allowed model name as per guidelines
const TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';
const MAX_CONTEXT_CHARS = 15000; // AIチャットのコンテキストに含める最大文字数

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
    ? `あなたはファイル管理アシスタントです。提供されたファイルリストやテキストファイル（TXT, MDなど）の内容に基づいて、ユーザーの質問に答えてください。
PDFやDOCXのようなバイナリファイルの具体的な内容については、あなたが直接参照することはできません。しかし、それらのファイルが存在することをユーザーに伝え、個別に要約を依頼すれば内容を把握できることを示唆してください。
ファイルの内容に関する一般的な質問には、提供されたテキストコンテンツの範囲で答えてください。`
    : `You are a file management assistant. Answer user questions based on the provided file list and the content of text-based files (e.g., TXT, MD) given to you.
For the specific content of binary files like PDF or DOCX, you cannot directly access their full content in this chat context. However, you should inform the user of their existence and suggest that you can summarize them individually if the user asks.
Answer general questions about file content based on the textual content provided to you.`;
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

function formatMultipleFileContentsForAI(files: FileSystemItem[], language: 'en' | 'ja'): string {
  let accumulatedContent = "";
  let charCount = 0;
  let filesIncludedCount = 0;

  const relevantFiles = files.filter(
    (file) =>
      file.type === FileType.FILE &&
      file.content &&
      file.mimeType 
      // SUMMARIZABLE_MIME_TYPES を使ってフィルタリングすると、PDF/DOCXも対象になるが、
      // それらの内容はBase64なので、ここでは主にテキスト系を優先する
  );

  if (relevantFiles.length === 0) {
    return language === 'ja'
      ? "コンテキストに含めることができる内容を持つ関連ファイルが見つかりませんでした。"
      : "No relevant files with content found to include in context.";
  }

  accumulatedContent += language === 'ja'
    ? "以下のファイル情報を参考にして回答してください:\n\n"
    : "Please use the following file information to answer:\n\n";

  for (const file of relevantFiles) {
    const fileHeader = `ファイル: ${file.name} (種類: ${file.mimeType})\n内容:\n`;
    let fileContentForPrompt = "";

    if (file.mimeType && (file.mimeType.startsWith('text/') || file.mimeType === 'text/markdown')) {
      fileContentForPrompt = file.content || "";
    } else if (file.mimeType && SUMMARIZABLE_MIME_TYPES.includes(file.mimeType)) {
      // PDF, DOCXなど (SUMMARIZABLE_MIME_TYPESに含まれるがテキストではないもの)
      fileContentForPrompt = language === 'ja'
        ? `(${file.name} の内容はバイナリデータです。このファイルについて詳しく知りたい場合は、個別に要約を依頼してください。)`
        : `(The content of ${file.name} is binary data. If you want to know more about this file, please ask for a specific summary.)`;
    } else {
      // その他の処理できないファイルタイプ
      fileContentForPrompt = language === 'ja'
        ? `(${file.name} の内容は表示できません。)`
        : `(The content of ${file.name} cannot be displayed directly.)`;
    }
    
    const currentFileChars = fileHeader.length + fileContentForPrompt.length + 2; // +2 for newlines

    if (charCount + currentFileChars > MAX_CONTEXT_CHARS && filesIncludedCount > 0) {
      accumulatedContent += language === 'ja'
        ? `\n...さらに${relevantFiles.length - filesIncludedCount}個の関連ファイルがありますが、コンテキスト長の制限のため一部省略されました。`
        : `\n...and ${relevantFiles.length - filesIncludedCount} more relevant files were omitted due to context length limits.`;
      break;
    }
    
    accumulatedContent += fileHeader + fileContentForPrompt + "\n\n";
    charCount += currentFileChars;
    filesIncludedCount++;

    if (charCount >= MAX_CONTEXT_CHARS && filesIncludedCount < relevantFiles.length) {
      accumulatedContent += language === 'ja'
        ? `\n...さらに${relevantFiles.length - filesIncludedCount}個の関連ファイルがありますが、コンテキスト長の制限のため一部省略されました。`
        : `\n...and ${relevantFiles.length - filesIncludedCount} more relevant files were omitted due to context length limits.`;
      break;
    }
  }
  return accumulatedContent;
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

  const fileContext = formatMultipleFileContentsForAI(currentFiles, language);
  const messageTextForModel = `${userMessage}\n\n${fileContext}`;
    
  try {
    const response = await chat.sendMessage({ message: messageTextForModel });
    return response.text;
  } catch (error) {
    console.error("Error sending message to AI Chat:", error);

    if ((error as any)?.message?.includes('429')) { 
        return language === 'ja' ? "リクエストが多すぎます。しばらくしてからもう一度お試しください。" : "Too many requests. Please try again later.";
    }
    // 他のエラータイプをここで確認できます。例えば、コンテキストが長すぎる場合など。
    // (error as any)?.message?.toLowerCase().includes('context length')
    // (error as any)?.message?.toLowerCase().includes('prompt is too long')
    if ( (error as any)?.message?.toLowerCase().includes('prompt is too long') || (error as any)?.message?.toLowerCase().includes('context length')) {
      return language === 'ja' ? "送信された情報が長すぎました。ファイル数を減らすか、より具体的な質問をしてください。" : "The provided information was too long. Please try with fewer files or a more specific question.";
    }
    return language === 'ja' ? "AIチャットでエラーが発生しました。" : "An error occurred with the AI chat.";
  }
}
