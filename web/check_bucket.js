const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n');
const envMap = {};
env.forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) envMap[k.trim()] = v.trim();
});

const supabase = createClient(envMap['NEXT_PUBLIC_SUPABASE_URL'], envMap['SUPABASE_SERVICE_ROLE_KEY']);

async function test() {
  const { data, error } = await supabase.storage.getBucket('signatures');
  if (error) {
    if (error.message.includes('not found')) {
       console.log('Bucket not found, creating...');
       const { error: createError } = await supabase.storage.createBucket('signatures', {
         public: true,
         fileSizeLimit: 1048576 * 5 // 5MB
       });
       if (createError) console.error('Error creating bucket:', createError);
       else console.log('Bucket signatures created.');
    } else {
       console.error("Error:", error);
    }
  } else {
    console.log("Bucket exists:", data.name);
  }
}

test();
