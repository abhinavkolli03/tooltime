import { ToolCategory } from '@/types/tool.types';

const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLUADE_API_KEY;
const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages';

const VALID_CATEGORIES: ToolCategory[] = [
    'power_tools', 'hand_tools', 'measuring', 'outdoor', 'plumbing', 'electrical',
];

export interface AIToolAnalysis {
    name: string;
    description: string;
    category: ToolCategory;
    condition: 'excellent' | 'good' | 'fair';
    suggestedHourlyRate: number;
    suggestedDailyRate: number;
    suggestedDeposit: number;
    estimatedRetailPrice: number;
    minHourlyRate: number;
    maxHourlyRate: number;
    minDailyRate: number;
    maxDailyRate: number;
    specs: string[];
    confidence: number;
}

const SYSTEM_PROMPT = `You are an expert tool identification assistant for a tool rental marketplace called ToolTime. 
When shown an image of a tool, you must identify it and return structured JSON with rental pricing suggestions.

All prices should be in USD (dollars, not cents).
Pricing should reflect fair market rental rates based on the tool's typical retail value and rental demand.

Return ONLY valid JSON matching this exact schema (no markdown, no code fences):
{
  "name": "string — specific tool name including brand if visible (e.g. 'DeWalt 20V MAX Cordless Drill')",
  "description": "string — 1-2 sentence description of the tool and its primary uses",
  "category": "one of: power_tools, hand_tools, measuring, outdoor, plumbing, electrical",
  "condition": "one of: excellent, good, fair — estimate from the image",
  "suggestedHourlyRate": number,
  "suggestedDailyRate": number,
  "suggestedDeposit": number,
  "estimatedRetailPrice": number,
  "minHourlyRate": number,
  "maxHourlyRate": number,
  "minDailyRate": number,
  "maxDailyRate": number,
  "specs": ["array of key specs like voltage, size, weight"],
  "confidence": number between 0 and 1
}

Pricing guidelines:
- Hourly rate: typically 2-5% of retail price
- Daily rate: typically 8-15% of retail price  
- Deposit: typically 25-50% of retail price
- Min/max rates should represent a reasonable ±30% range around the suggested rate
- Round all prices to nearest 0.50`;

function detectMediaType(base64: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
    if (base64.startsWith('/9j/')) return 'image/jpeg';
    if (base64.startsWith('iVBOR')) return 'image/png';
    if (base64.startsWith('R0lGO')) return 'image/gif';
    if (base64.startsWith('UklGR')) return 'image/webp';
    return 'image/jpeg';
}

export async function analyzeToolImage(base64Image: string): Promise<AIToolAnalysis> {
    if (!CLAUDE_API_KEY || CLAUDE_API_KEY.includes('your_claude')) {
        throw new Error('Claude API key not configured. Add EXPO_PUBLIC_CLUADE_API_KEY to your .env file.');
    }

    const mediaType = detectMediaType(base64Image);

    const response = await fetch(CLAUDE_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: base64Image,
                            },
                        },
                        {
                            type: 'text',
                            text: 'Identify this tool and suggest rental pricing.',
                        },
                    ],
                },
            ],
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Claude API error:', response.status, errorBody);
        throw new Error(`AI analysis failed (${response.status}). Please try again.`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (!content) throw new Error('No response from AI model.');

    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!VALID_CATEGORIES.includes(parsed.category)) {
        parsed.category = 'hand_tools';
    }
    if (!['excellent', 'good', 'fair'].includes(parsed.condition)) {
        parsed.condition = 'good';
    }

    return {
        name: String(parsed.name || 'Unknown Tool'),
        description: String(parsed.description || ''),
        category: parsed.category,
        condition: parsed.condition,
        suggestedHourlyRate: Math.max(1, Number(parsed.suggestedHourlyRate) || 5),
        suggestedDailyRate: Math.max(5, Number(parsed.suggestedDailyRate) || 25),
        suggestedDeposit: Math.max(10, Number(parsed.suggestedDeposit) || 50),
        estimatedRetailPrice: Math.max(20, Number(parsed.estimatedRetailPrice) || 100),
        minHourlyRate: Math.max(0.5, Number(parsed.minHourlyRate) || 2),
        maxHourlyRate: Math.max(2, Number(parsed.maxHourlyRate) || 20),
        minDailyRate: Math.max(3, Number(parsed.minDailyRate) || 10),
        maxDailyRate: Math.max(10, Number(parsed.maxDailyRate) || 80),
        specs: Array.isArray(parsed.specs) ? parsed.specs.map(String) : [],
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
    };
}
