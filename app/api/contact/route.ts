
import { NextResponse } from 'next/server';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Log the lead (In production, replace with Email/DB call)
        console.log('--- NEW LEAD RECEIVED ---');
        console.log('Name:', body.name);
        console.log('Email:', body.email);
        console.log('Timestamp:', new Date().toISOString());
        console.log('-------------------------');

        return NextResponse.json({ success: true }, { headers: corsHeaders });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed' },
            { status: 500, headers: corsHeaders }
        );
    }
}
