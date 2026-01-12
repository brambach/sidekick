/**
 * Update Clerk user metadata
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClerkClient } from '@clerk/backend';

const clerkId = process.argv[2] || 'user_38AfIn7gSRsZuHjieZmGpaLWVP5';
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

console.log(`\n🔧 Updating Clerk metadata for ${clerkId}...`);

try {
  const user = await clerk.users.updateUser(clerkId, {
    publicMetadata: {
      role: 'admin'
    }
  });

  console.log('✅ Updated Clerk metadata to admin');
  console.log('   Email:', user.emailAddresses[0]?.emailAddress);
  console.log('   Role:', user.publicMetadata.role);
  console.log('\n🎉 Done! Sign out and sign back in to see admin dashboard.');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
