import { NextRequest } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import mammoth from "mammoth";

export const maxDuration = 60;

async function extractTextFromFile(
  file: File,
  buffer: ArrayBuffer
): Promise<string> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  try {
    // Use AI SDK GPT-5 for PDF reading
    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      const result = await generateText({
        model: openai("gpt-5"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract and return the full text content from this PDF file.",
              },
              {
                type: "file",
                data: Buffer.from(buffer),
                mediaType: "application/pdf",
                filename: file.name,
              },
            ],
          },
        ],
      });
      return result.text || "";
    }

    // Use AI SDK for image processing
    if (fileType.startsWith("image/")) {
      const result = await generateText({
        model: openai("gpt-5"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract and return any text content from this image. If there is no readable text, describe what you see in the image.",
              },
              {
                type: "image",
                image: Buffer.from(buffer),
              },
            ],
          },
        ],
      });
      return result.text || "";
    }

    if (
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx")
    ) {
      const docxBuffer = Buffer.from(buffer);
      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      return result.value || "";
    }

    if (fileType === "application/msword" || fileName.endsWith(".doc")) {
      const docBuffer = Buffer.from(buffer);
      const result = await mammoth.extractRawText({ buffer: docBuffer });
      return result.value || "";
    }

    // Handle JSON files
    if (fileType === "application/json" || fileName.endsWith(".json")) {
      try {
        const decoder = new TextDecoder();
        const jsonText = decoder.decode(buffer);
        // Parse and pretty-print JSON for better readability
        const jsonObj = JSON.parse(jsonText);
        return JSON.stringify(jsonObj, null, 2);
      } catch (error) {
        // If JSON parsing fails, return raw text
        const decoder = new TextDecoder();
        return decoder.decode(buffer);
      }
    }

    // For other text-based files, try to read as text
    if (
      fileType.startsWith("text/") ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md")
    ) {
      const decoder = new TextDecoder();
      return decoder.decode(buffer);
    }

    return `[File: ${file.name} - Text extraction not supported for this file type]`;
  } catch (error) {
    console.error(`Error extracting text from ${file.name}:`, error);
    return `[Error extracting text from ${file.name}: ${
      error instanceof Error ? error.message : "Unknown error"
    }]`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ error: "No files provided under 'files' field" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      const arrayBuffer = await file.arrayBuffer();

      // Extract text content from the file using AI SDK
      console.log(`[Uploads API] Processing file: ${file.name} (${file.type})`);
      const extractedText = await extractTextFromFile(file, arrayBuffer);
      console.log(
        `[Uploads API] Extracted text length: ${extractedText?.length || 0}`
      );

      results.push({
        name: file.name,
        mimeType: file.type,
        size: file.size,
        extractedText, // The main purpose - extracted text content
        processed: true,
      });
    }

    console.log(`[Uploads API] Processed ${results.length} files successfully`);
    return new Response(JSON.stringify({ files: results }, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Upload API error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Upload failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
