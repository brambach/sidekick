/**
 * Quick script to make user admin - uses direct SQL
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@vercel/postgres';

// Load env
config({ path: resolve(process.cwd(), '.env.local') });

const clerkId = process.argv[2] || 'user_38AfIn7gSRsZuHjieZmGpaLWVP5';

console.log(`\n🔧 Making user ${clerkId} an admin...`);

try {
  // Update or create user as admin in database
  await sql`
    INSERT INTO users (clerk_id, role, agency_id, client_id, created_at, updated_at)
    VALUES (${clerkId}, 'admin', NULL, NULL, NOW(), NOW())
    ON CONFLICT (clerk_id)
    DO UPDATE SET role = 'admin', updated_at = NOW()
    RETURNING id, clerk_id, role
  `.then(result => {
    if (result.rows.length > 0) {
      console.log('✅ Updated user in database to admin');
      console.log('   User ID:', result.rows[0].id);
      console.log('   Clerk ID:', result.rows[0].clerk_id);
      console.log('   Role:', result.rows[0].role);
    }
  });

  console.log('\n📋 Next step: Update Clerk metadata');
  console.log('   1. Go to: https://dashboard.clerk.com');
  console.log('   2. Click "Users"');
  console.log(`   3. Find user: ${clerkId}`);
  console.log('   4. Go to "Metadata" tab');
  console.log('   5. Under "Public metadata", add:');
  console.log('      {"role": "admin"}');
  console.log('   6. Save');
  console.log('\n💡 Then sign out and sign back in to see admin dashboard');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
