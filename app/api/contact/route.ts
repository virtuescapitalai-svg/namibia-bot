
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Initialize Resend with the provided key (or env var)
const resend = new Resend(process.env.RESEND_API_KEY || 're_U2fPsNhv_4QixQs2zYwggJxEkpUx5mWmr');

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, details } = body;

        // Send Email
        const { data, error } = await resend.emails.send({
            from: 'Secret Namibia Concierge <onboarding@resend.dev>', // Use verified domain in prod
            to: ['virtuescapitalai@gmail.com'],
            subject: `New Safari Enquiry from ${name}`,
            html: `
                <h1>New Enquiry</h1>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Details:</strong> ${details || 'No specific details provided.'}</p>
                <p><small>Sent from Secret Namibia Chatbot</small></p>
            `,
        });

        if (error) {
            console.error('Resend Error:', error);
            // Log it anyway so we don't lose the lead
            console.log('FALLBACK LOG:', body);
            // Don't fail the request to the user, just log error
        }

        return NextResponse.json({ success: true, data }, { headers: corsHeaders });
    } catch (error) {
        console.error('Contact API Error:', error);
        return NextResponse.json(
            { error: 'Failed' },
            { status: 500, headers: corsHeaders }
        );
    }
}
