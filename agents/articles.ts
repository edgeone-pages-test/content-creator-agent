const logger = {
    log(...args: unknown[]) { console.log(`[articles][${new Date().toISOString()}]`, ...args); },
    error(...args: unknown[]) { console.error(`[articles][${new Date().toISOString()}]`, ...args); },
};

interface ArticleVersion {
    content: string;
    createdAt: string;
    wordCount: number;
}

interface ArticleData {
    id: string;
    title: string;
    keywords: string;
    style: string;
    createdAt: string;
    wordCount: number;
    versions: ArticleVersion[];
    currentVersion: number;
}

const MANIFEST_CONV = 'articles-manifest';

async function getManifest(store: any): Promise<string[]> {
    try {
        const messages = await store.getMessages({ conversationId: MANIFEST_CONV, limit: 1, order: 'desc' });
        if (messages.length > 0 && messages[0].content) {
            const data = typeof messages[0].content === 'string'
                ? JSON.parse(messages[0].content)
                : messages[0].content;
            return Array.isArray(data) ? data : [];
        }
    } catch {}
    return [];
}

async function saveManifest(store: any, ids: string[]) {
    try { await store.clearMessages({ conversationId: MANIFEST_CONV }); } catch {}
    await store.appendMessage({
        conversationId: MANIFEST_CONV,
        role: 'system',
        content: JSON.stringify(ids),
    });
}

async function getArticleById(store: any, id: string): Promise<ArticleData | null> {
    try {
        const messages = await store.getMessages({ conversationId: `article-${id}`, limit: 1, order: 'desc' });
        if (messages.length > 0 && messages[0].content) {
            return typeof messages[0].content === 'string'
                ? JSON.parse(messages[0].content)
                : messages[0].content;
        }
    } catch {}
    return null;
}

async function storeArticle(store: any, articleData: ArticleData) {
    try { await store.clearMessages({ conversationId: `article-${articleData.id}` }); } catch {}
    await store.appendMessage({
        conversationId: `article-${articleData.id}`,
        role: 'system',
        content: JSON.stringify(articleData),
        metadata: { type: 'article', id: articleData.id },
    });
}

function computeWordCount(content: string): number {
    const chinese = (content.match(/[\u4e00-\u9fff]/g) || []).length;
    const english = content.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(Boolean).length;
    return chinese + english;
}

function createResponse(data: any, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    });
}

export async function onRequest(context: any) {
    const { request, store } = context;
    const body = request?.body ?? {};
    const { action } = body;

    if (!store) {
        return createResponse({
            error: 'BLOB_NOT_CONFIGURED',
            message: 'Store is not available. Deploy to EdgeOne Makers for automatic configuration.',
        }, 503);
    }

    try {
        switch (action) {
            case 'list': {
                const ids = await getManifest(store);
                const articles: ArticleData[] = [];
                for (const id of ids) {
                    const data = await getArticleById(store, id);
                    if (data) articles.push(data);
                }
                articles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                return createResponse({ articles });
            }

            case 'save': {
                const { article } = body;
                if (!article?.content) {
                    return createResponse({ error: 'Missing article data' }, 400);
                }
                const id = article.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const wordCount = computeWordCount(article.content);
                const now = article.createdAt || new Date().toISOString();
                const articleData: ArticleData = {
                    id,
                    title: article.title || 'Untitled',
                    keywords: article.keywords || '',
                    style: article.style || '',
                    createdAt: now,
                    wordCount,
                    versions: [{ content: article.content, createdAt: now, wordCount }],
                    currentVersion: 0,
                };
                await storeArticle(store, articleData);
                const ids = await getManifest(store);
                if (!ids.includes(id)) {
                    await saveManifest(store, [id, ...ids]);
                }
                logger.log('Saved article:', id, `(${wordCount} words)`);
                return createResponse({ success: true, id });
            }

            case 'addVersion': {
                const { id, content: newContent } = body;
                if (!id || !newContent) {
                    return createResponse({ error: 'Missing id or content' }, 400);
                }
                const existing = await getArticleById(store, id);
                if (!existing) {
                    return createResponse({ error: 'Article not found' }, 404);
                }
                const wordCount = computeWordCount(newContent);
                const now = new Date().toISOString();
                existing.versions.push({ content: newContent, createdAt: now, wordCount });
                existing.currentVersion = existing.versions.length - 1;
                existing.wordCount = wordCount;
                const firstLine = newContent.split('\n').find((l: string) => l.trim()) || 'Untitled';
                existing.title = firstLine.replace(/^#+\s*/, '').slice(0, 100);
                await storeArticle(store, existing);
                logger.log('Added version:', id, `v${existing.versions.length} (${wordCount} words)`);
                return createResponse({ success: true, id, versionCount: existing.versions.length });
            }

            case 'get': {
                const { id } = body;
                if (!id) return createResponse({ error: 'Missing id' }, 400);
                const data = await getArticleById(store, id);
                if (!data) return createResponse({ error: 'Article not found' }, 404);
                return createResponse({ article: data });
            }

            case 'delete': {
                const { id } = body;
                if (!id) return createResponse({ error: 'Missing id' }, 400);
                try { await store.clearMessages({ conversationId: `article-${id}` }); } catch {}
                const ids = await getManifest(store);
                await saveManifest(store, ids.filter((i: string) => i !== id));
                logger.log('Deleted article:', id);
                return createResponse({ success: true });
            }

            default:
                return createResponse({ error: 'Unknown action' }, 400);
        }
    } catch (e: any) {
        const msg = e?.message || String(e);
        const isCredentialError =
            e?.code === 'CREDENTIAL_ERROR' ||
            msg.includes('credential') ||
            msg.includes('Invalid project') ||
            msg.includes('Memory storage operation failed');
        if (isCredentialError) {
            logger.error('Storage not configured:', msg);
            return createResponse({ error: 'BLOB_NOT_CONFIGURED' }, 503);
        }
        logger.error(msg);
        return createResponse({ error: msg }, 500);
    }
}
