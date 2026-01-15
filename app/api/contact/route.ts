
import { NextResponse } from 'next/server';
import { Client } from '@hubspot/api-client';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Initialize HubSpot Client outside to allow reuse if possible, but inside handler is safer for env vars in some contexts
// const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { firstName, lastName, email, request } = body;

        console.log('API/Contact: Received request', { firstName, lastName, email });
        console.log('API/Contact: Token verification:', process.env.HUBSPOT_ACCESS_TOKEN ? 'Token is set' : 'Token is MISSING');

        if (!process.env.HUBSPOT_ACCESS_TOKEN) {
            throw new Error("HUBSPOT_ACCESS_TOKEN is not configured.");
        }

        const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

        let contactId;

        // 1. Search for existing contact by email
        const publicObjectSearchRequest = {
            filterGroups: [
                {
                    filters: [
                        {
                            propertyName: 'email',
                            operator: 'EQ' as any,
                            value: email,
                        },
                    ],
                },
            ],
            sorts: ['email'],
            properties: ['email', 'firstname', 'lastname'],
            limit: 1,
            after: '0',
        };

        const searchResult = await hubspotClient.crm.contacts.searchApi.doSearch(publicObjectSearchRequest);

        if (searchResult.total > 0) {
            // Contact exists
            contactId = searchResult.results[0].id;
            console.log('Found existing contact:', contactId);

            // Optionally update contact info if name provided? 
            // For now let's just use the ID.
        } else {
            // Contact does not exist, create new one
            const contactInput = {
                properties: {
                    email: email,
                    firstname: firstName,
                    lastname: lastName,
                },
            };
            const createContactResponse = await hubspotClient.crm.contacts.basicApi.create(contactInput);
            contactId = createContactResponse.id;
            console.log('Created new contact:', contactId);
        }

        // 2. Create a Deal associated with the contact
        // Association Type for Deal to Contact is 3

        const dealInput = {
            properties: {
                dealname: `Safari Enquiry - ${firstName} ${lastName}`,
                pipeline: 'default',
                dealstage: 'appointmentscheduled',
                amount: '0',
                description: `
                    Name: ${firstName} ${lastName}
                    Email: ${email}
                    Request: ${request || 'No details provided'}
                `,
            },
            associations: [
                {
                    to: { id: contactId },
                    types: [
                        {
                            associationCategory: "HUBSPOT_DEFINED" as any,
                            associationTypeId: 3
                        }
                    ]
                }
            ]
        };



        const dealResponse = await hubspotClient.crm.deals.basicApi.create(dealInput);
        console.log('Created deal:', dealResponse.id);

        return NextResponse.json({ success: true, contactId, dealId: dealResponse.id }, { headers: corsHeaders });

    } catch (error) {
        console.error('HubSpot API Error:', error);
        // Fallback or just error out
        return NextResponse.json(
            { error: 'Failed' },
            { status: 500, headers: corsHeaders }
        );
    }
}
