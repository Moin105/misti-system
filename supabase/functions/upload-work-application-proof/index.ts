import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit: 10 uploads per hour per IP
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_UPLOADS_PER_WINDOW = 10;

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

// Maximum file name length
const MAX_FILENAME_LENGTH = 255;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';

    console.log(`Upload request from IP: ${clientIp}`);

    // Create Supabase client with service role for rate limiting and storage
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check rate limit
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', clientIp)
      .eq('endpoint', 'upload-work-application-proof')
      .gte('created_at', windowStart);

    if (countError) {
      console.error('Rate limit check error:', countError);
    }

    if ((count || 0) >= MAX_UPLOADS_PER_WINDOW) {
      console.log(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(JSON.stringify({ 
        error: 'Too many uploads. Please try again later.',
        retryAfter: 3600
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '3600'
        },
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File size exceeds 10MB limit' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid file type. Only JPEG, PNG, and PDF files are allowed.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file name length
    if (file.name.length > MAX_FILENAME_LENGTH) {
      return new Response(JSON.stringify({ error: 'File name too long' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate secure random filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    const safeExt = allowedExtensions.includes(fileExt) ? fileExt : 'bin';
    const randomId = crypto.randomUUID();
    const timestamp = Date.now();
    const fileName = `${timestamp}-${randomId}.${safeExt}`;

    console.log(`Uploading file: ${fileName}, size: ${file.size}, type: ${file.type}`);

    // Convert file to array buffer for upload
    const fileBuffer = await file.arrayBuffer();

    // Upload to storage using service role
    const { error: uploadError } = await supabaseAdmin.storage
      .from('work-application-proofs')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record rate limit entry
    await supabaseAdmin.from('rate_limits').insert({
      identifier: clientIp,
      endpoint: 'upload-work-application-proof'
    });

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('work-application-proofs')
      .getPublicUrl(fileName);

    console.log(`Upload successful: ${fileName}`);

    return new Response(JSON.stringify({ 
      success: true,
      publicUrl: publicUrlData.publicUrl 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
