/**
 * Keyword Suggestion Agent
 *
 * Given an article topic, suggests relevant SEO keywords using LLM.
 * Called automatically when the user blurs the topic input field.
 */
import { HumanMessage } from '@langchain/core/messages';
import { getAgentEnv, createModel, createLogger } from './_shared';

const logger = createLogger('suggest-keywords');

const SYSTEM_PROMPT = `You are an SEO keyword expert. Given an article topic, suggest 3-5 highly relevant keywords or short phrases for SEO optimization.

RULES:
- Output ONLY the keywords separated by commas (e.g., "keyword1, keyword2, keyword3")
- Use the same language as the topic
- Keywords should be specific and relevant to the topic
- Include a mix of broad and long-tail keywords
- Do NOT output any explanation, numbering, or extra text`;

export async function onRequest(context: any) {
    const { request, env } = context;
    const { topic } = request?.body ?? {};

    if (!topic?.trim()) {
        return new Response(JSON.stringify({ error: 'Missing topic' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        });
    }

    try {
        const envVars = getAgentEnv(env);
        const modelInstance = await createModel(envVars, { timeout: 30_000 });

        logger.log(`Suggesting keywords for topic: "${topic}"`);

        const response = await modelInstance.invoke([
            { role: 'system', content: SYSTEM_PROMPT },
            new HumanMessage(`Topic: "${topic}"`),
        ]);

        const rawContent = (response as any).content;
        const text = typeof rawContent === 'string'
            ? rawContent
            : Array.isArray(rawContent)
                ? rawContent.map((c: any) => typeof c === 'string' ? c : c.text || '').join('')
                : String(rawContent || '');

        // Clean up: remove any quotes, trim whitespace
        const keywords = text.replace(/^["']|["']$/g, '').trim();

        logger.log(`Suggested keywords: "${keywords}"`);

        return new Response(JSON.stringify({ keywords }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        });
    } catch (e) {
        const msg = (e as Error).message;
        logger.error(msg);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        });
    }
}
