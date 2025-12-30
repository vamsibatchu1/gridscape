
import { GoogleGenAI, Type } from "@google/genai";
import type { Point, QuadrantLabels } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const formatError = (error: unknown, context: string): Error => {
    console.error(`Error during ${context}:`, error);
    let userMessage = `An error occurred during ${context}.`;
    if (error instanceof Error) userMessage = error.message;
    return new Error(userMessage);
}

export interface GeminiMainContentResponse {
  text: string;
  bridge: string | null;
  terms: string[];
}

export const getQuadrantMainContent = async (
  labels: QuadrantLabels, 
  point: Point, 
  context: string,
  history: string[] = []
): Promise<GeminiMainContentResponse> => {
  const sanitizedContext = context.trim() || 'a random fascinating concept';
  
  const historyChain = history.length > 0 
    ? history.map((text, index) => `[Entry ${index + 1}]: ${text}`).join('\n\n---\n\n')
    : null;

  const prompt = `
    You are an expert researcher building a sequential knowledge map. You are writing a human-readable, Wikipedia-style entry.

    ${historyChain ? `PREVIOUS NARRATIVE CHAIN:\n${historyChain}` : `This is the BEGINNING of the exploration for: "${sanitizedContext}"`}

    CURRENT FOCUS: "${sanitizedContext}"
    
    GRID PLACEMENT:
    Coordinates: X=${point.x.toFixed(2)}, Y=${point.y.toFixed(2)}
    - Horizontal Axis: ${labels.left} <---> ${labels.right}
    - Vertical Axis: ${labels.bottom} <---> ${labels.top}

    TASK:
    1. Write the main content (150-250 words) as the NEXT LOGICAL CHAPTER.
    2. Write a "bridge" (max 12 words) summarizing the logical transition from the previous entry to this one.
    3. Identify 3-5 specific, important terms or concepts within the main content that deserve further deep-dives. These MUST be strings that appear exactly in the "text" field.

    FORMAT:
    Return a JSON object with three keys:
    - "text": the main article content.
    - "bridge": the connective summary (or null if this is the first entry).
    - "terms": an array of the identified key terms.
  `;
  
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING },
                    bridge: { type: Type.STRING, nullable: true },
                    terms: { 
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                },
                required: ["text", "bridge", "terms"]
            }
        }
    });

    const data = JSON.parse(response.text || '{"text": "", "bridge": null, "terms": []}');
    return data;
  } catch (error) {
    throw formatError(error, 'main content generation');
  }
};

export const getSuggestions = async (
  context: string,
  text: string
): Promise<string[]> => {
  const prompt = `
    Based on the following research entry for "${context}":
    "${text.substring(0, 1000)}"

    Suggest exactly 3 distinct, provocative branching paths for further exploration.
    Each suggestion must be a single, concise sentence (max 12 words) that invites the user to click.
    Each must represent a different logical direction (e.g., one practical, one philosophical, one historical).

    Respond with ONLY a JSON object: {"suggestions": ["path 1", "path 2", "path 3"]}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["suggestions"]
        }
      }
    });
    const data = JSON.parse(response.text || '{"suggestions": []}');
    return data.suggestions.slice(0, 3);
  } catch (error) {
    console.error("Failed to get suggestions:", error);
    return ["Explore the implications...", "Trace the origins...", "Uncover the hidden patterns..."];
  }
};

export const getQuadrantAsciiArt = async (
  context: string,
  contentText: string
): Promise<string> => {
  const prompt = `
    Create a "nerdy" ASCII art diagram or schematic (max 12 lines high, 40 chars wide) for the following topic: "${context}".
    
    The diagram should represent the core architecture or concept described in this text:
    "${contentText.substring(0, 500)}..."

    Use standard ASCII characters like +, -, |, /, \\, *, o, >. 
    It should look like a technical blueprint, a flow chart, or a conceptual model. 
    Return ONLY the raw ASCII art, no markdown blocks, no intro, no outro.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
    });
    return response.text?.trim() || "(Schematic Unavailable)";
  } catch (error) {
    console.error("ASCII Art Generation failed:", error);
    return "(Diagram Calibration Error)";
  }
};

export const getPointForConcept = async (name: string): Promise<Point> => {
    const prompt = `
        Assign coordinates for the concept: "${name}".
        Y-axis: top (+1.0, Abstract) to bottom (-1.0, Concrete).
        X-axis: left (-1.0, Simple) to right (+1.0, Complex).
        Respond with only JSON: {"x": number, "y": number}.
    `;
     try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        x: { type: Type.NUMBER, description: "X coordinate between -1.0 and 1.0" },
                        y: { type: Type.NUMBER, description: "Y coordinate between -1.0 and 1.0" }
                    },
                    required: ["x", "y"]
                }
            }
        });
        const pointData = JSON.parse(response.text || '{"x": 0, "y": 0}');
        return {
          x: Math.max(-1, Math.min(1, typeof pointData.x === 'number' ? pointData.x : 0)),
          y: Math.max(-1, Math.min(1, typeof pointData.y === 'number' ? pointData.y : 0))
        };
    } catch (error) {
        throw formatError(error, 'concept placement');
    }
}
