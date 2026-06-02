/**
 * Health check — EdgeOne Pages Node Function
 * File path cloud-functions/health/index.ts maps to GET/POST /health
 */
export async function onRequest() {
    return new Response(
        JSON.stringify({ status: 'ok', timestamp: new Date().toISOString(), service: 'content-creator' }),
        { status: 200, headers: { 'Content-Type': 'application/json; charset=UTF-8' } },
    );
}
