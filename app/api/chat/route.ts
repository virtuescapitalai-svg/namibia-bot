
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
});

// Configure CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Allow all domains (including Framer)
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // Load Knowledge Base
        const dataPath = path.join(process.cwd(), 'data', 'knowledge.json');
        let knowledgeBase = [];
        if (fs.existsSync(dataPath)) {
            const fileContent = fs.readFileSync(dataPath, 'utf-8');
            knowledgeBase = JSON.parse(fileContent);
        }

        // Construct System Prompt
        const context = knowledgeBase
            .map((page: any) => `URL: ${page.url}\nTitle: ${page.title}\nContent:\n${page.content}`)
            .join('\n\n---\n\n');

        const systemPrompt = `You are the "Secret Namibia Concierge", an expert luxury travel assistant.
    Your tone is: Elegant, Warm, Professional, and Knowledgeable.
    
    **KEY PRICING DATA (Estimates in USD):**
    - **Average Safari:** ~$14,600 USD per person.
    - **Range:** ~$700 (Day trips) to ~$80,000 (Ultra-Luxury).
    - **Notes:** Self-drive fits the lower end ($5k-$10k), Fly-in fits the higher end ($15k+). All quotes are custom.
    
    **INSTRUCTIONS:**
    1.  **Pricing:** If asked for price, give the average and range. Emphasize "custom tailored" nature.
    2.  **Contact:** If the user wants to book, asks for an agent, or shows strong intent, output the strict code: [SHOW_CONTACT_FORM]
        - Do NOT say "I will show you a form", just output the code at the end of your helpful message.
        - Example: "I'd be delighted to connect you with a specialist. [SHOW_CONTACT_FORM]"
    3.  **Style:** Use **bold** for highlights. Keep it concise.

    KNOWLEDGE BASE:
    ${context}
    `;

        // Call OpenAI
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages,
            ],
        });

        const reply = completion.choices[0].message;

        return NextResponse.json(reply, { headers: corsHeaders });
    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 500, headers: corsHeaders }
        );
    }
}
