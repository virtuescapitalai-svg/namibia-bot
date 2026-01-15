
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

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key') {
            return NextResponse.json({ error: 'OPENAI_API_KEY is missing in Vercel Environment Variables' }, { status: 500, headers: corsHeaders });
        }

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
    
    **KEY PRICING DATA (PER PERSON SHARING):**
    | Duration | Self-Drive (Approx) | Private Guided (Approx) | Fly-In (Approx) |
    | :--- | :--- | :--- | :--- |
    | **11 Day** | $5,200 | $8,500 | $16,000 |
    | **14 Day** | $5,250 | $9,000 | $17,500 |
    | **15 Day** | $6,000 | $10,500 | $19,500 |
    | **17 Day** | $7,000 | $12,000 | $22,000 |
    
    **Notes:**
    - "Self-Drive" is the most affordable.
    - "Fly-In" allows you to reach remote areas quickly but is premium.
    - "Private Guided" offers a dedicated guide/driver.

    **FORM PROTOCOL:**
    You have a tool: [SHOW_CONTACT_FORM].
    
    **WHEN TO USE:**
    - If the user asks for a quote, price, or booking availability.
    - If the user seems interested in proceeding.

    **HOW TO USE (PASSIVE OFFER):**
    - DO NOT demand they fill it out.
    - DO NOT say "I have opened the form."
    - INSTEAD say: "I've included an enquiry form below if you'd like a formal quote." or "Feel free to use the form below to request a specialist."
    - Output: [SHOW_CONTACT_FORM]
    
    **ABSOLUTE BAN LIST:**
    - You are **STRICTLY FORBIDDEN** from asking "Can you see the form?"
    - You are **STRICTLY FORBIDDEN** from asking "Is the form visible?"

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
