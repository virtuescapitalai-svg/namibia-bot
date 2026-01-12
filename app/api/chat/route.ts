
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key', // User needs to provide this
});

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

        const systemPrompt = `You are a helpful and luxurious concierge AI for Secret Namibia, a premium travel company.
    
    Your goal is to assist visitors with information about safaris, tours, and the company.
    Always be polite, professional, and concise. Use a tone that reflects luxury and exclusivity.
    
    Use the following KNOWLEDGE BASE to answer questions. 
    If the answer is not in the knowledge base, politely ask the user to contact the team directly via the contact page or email.
    
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

        return NextResponse.json(reply);
    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
