
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
    
    **KEY PRICING DATA (Based on Actual Past Invoices):**
    - **11 Day Safari:** ~$5,200 USD (Self-drive/Standard). Fly-in option: ~$16,000 USD.
    - **12 Day Self-Drive:** ~$4,200 USD.
    - **14 Day Safari:** ~$5,250 USD.
    - **15 Day Safari:** ~$11,000 USD.
    - **17 Day Safari:** ~$13,000 USD.
    - **Fly-In Safaris:** Generally $8,000 - $16,000+ depending on duration.
    - **Note:** "Self-Drive" is significantly more affordable (~$4k-$6k) than "Fly-In" or "Ultra-Luxury" (~$10k-$20k+).
    
    **INSTRUCTIONS:**
    1.  **Pricing:** If asked for price, provide the estimate (e.g. ~$5,200) AND IMMEDIATELY follow up with: "I can prepare a formal quote for you? [SHOW_CONTACT_FORM]"
        - ALWAYS verify the user sees the form when discussing specific costs.
    2.  **Contact:** If the user wants to book, asks for an agent, or shows strong intent, output: [SHOW_CONTACT_FORM]
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
