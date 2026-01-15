
import { Client } from '@hubspot/api-client';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const token = process.env.HUBSPOT_ACCESS_TOKEN;
console.log('Testing HubSpot Connection...');
console.log('Token exists:', !!token);
if (token) {
    console.log('Token starts with:', token.substring(0, 8) + '...');
}

const hubspotClient = new Client({ accessToken: token });

async function test() {
    try {
        // 1. Search Contact
        console.log('\n1. Searching for contact (test@example.com)...');
        const email = 'test_debug_' + Date.now() + '@example.com';

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
        console.log('Search success. Total:', searchResult.total);

        // 2. Create Contact
        console.log('\n2. Creating test contact...');
        const contactInput = {
            properties: {
                email: email,
                firstname: 'Debug',
                lastname: 'User',
            },
        };
        const contact = await hubspotClient.crm.contacts.basicApi.create(contactInput);
        console.log('Contact created:', contact.id);

        // 3. Create Deal
        console.log('\n3. Creating test deal...');
        const dealInput = {
            properties: {
                dealname: `Debug Deal - ${email}`,
                pipeline: 'default',
                dealstage: 'appointmentscheduled',
                amount: '0',
                description: 'Debug description',
            },
            associations: [
                {
                    to: { id: contact.id },
                    types: [
                        {
                            associationCategory: "HUBSPOT_DEFINED" as any,
                            associationTypeId: 3
                        }
                    ]
                }
            ]
        };

        const deal = await hubspotClient.crm.deals.basicApi.create(dealInput);
        console.log('Deal created:', deal.id);
        console.log('SUCCESS: HubSpot integration is working from script.');

    } catch (e: any) {
        console.error('\nFAIL: HubSpot API Error');
        console.error(JSON.stringify(e, null, 2));
        if (e.body) console.error('Response Body:', JSON.stringify(e.body, null, 2));
    }
}

test();
