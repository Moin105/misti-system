const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WordPress and old content path patterns that should return 410
const GONE_PATTERNS = [
  /^\/wp-admin(\/.*)?$/,
  /^\/wp-content(\/.*)?$/,
  /^\/wp-includes(\/.*)?$/,
  /^\/category(\/.*)?$/,
  /^\/tag(\/.*)?$/,
  /^\/feed(\/.*)?$/,
  /^\/author(\/.*)?$/,
  /^\/page(\/.*)?$/,
  /^\/old-blog(\/.*)?$/,
  /^\/product(\/.*)?$/,
];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    console.log(`Checking path: ${path}`);

    // Check if path matches any gone pattern
    const isGonePath = GONE_PATTERNS.some(pattern => pattern.test(path));

    if (isGonePath) {
      console.log(`Path ${path} matched gone pattern - returning 410`);
      
      return new Response('This page has been permanently removed.', {
        status: 410,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=31536000', // Cache 410 responses for 1 year
        },
      });
    }

    // Path doesn't match - return 404
    console.log(`Path ${path} did not match gone pattern - returning 404`);
    return new Response('Not Found', {
      status: 404,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Error in handle-gone-pages:', error);
    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
});
