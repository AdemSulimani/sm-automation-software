/**
 * Shërbimi OAuth për Meta: shkëmbim kodi për token, marrje e faqeve dhe llogarive Instagram.
 */

const META_GRAPH_BASE = 'https://graph.facebook.com';
const META_API_VERSION = 'v21.0';

function getAppConfig() {
  const clientId = process.env.META_APP_ID || '';
  const clientSecret = process.env.META_APP_SECRET || '';
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const backendUrl = (process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
  const redirectUri = `${backendUrl}/api/oauth/meta/callback`;
  return { clientId, clientSecret, frontendUrl, redirectUri };
}

/**
 * Kthen URL-in e dialogut të Facebook Login për OAuth.
 */
function getAuthorizationUrl(state) {
  const { clientId, redirectUri } = getAppConfig();
  const scope = [
    'pages_show_list',
    'pages_messaging',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_manage_messages',
  ].join(',');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state: state || '',
    response_type: 'code',
  });
  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params.toString()}`;
}

/**
 * Shkëmben kodin e autorizimit për access token (short-lived).
 */
async function exchangeCodeForToken(code) {
  const { clientId, clientSecret, redirectUri } = getAppConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });
  const url = `${META_GRAPH_BASE}/${META_API_VERSION}/oauth/access_token?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const err = new Error(data.error?.message || 'Meta token exchange failed');
    err.code = data.error?.code;
    throw err;
  }
  return data.access_token;
}

/**
 * Shkëmben short-lived user token për long-lived (opsional; për prodhim).
 */
async function exchangeForLongLivedToken(shortLivedToken) {
  const { clientId, clientSecret } = getAppConfig();
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: shortLivedToken,
  });
  const url = `${META_GRAPH_BASE}/${META_API_VERSION}/oauth/access_token?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    return shortLivedToken;
  }
  return data.access_token || shortLivedToken;
}

/**
 * Merr listën e faqeve të përdoruesit me access token të faqes dhe (nëse ka) llogari Instagram.
 */
async function fetchPagesAndInstagram(userAccessToken) {
  const longLived = await exchangeForLongLivedToken(userAccessToken);
  const fields = 'id,name,access_token,instagram_business_account{id,username}';
  const url = `${META_GRAPH_BASE}/${META_API_VERSION}/me/accounts?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(longLived)}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const err = new Error(data.error?.message || 'Failed to fetch pages');
    err.code = data.error?.code;
    throw err;
  }
  const pages = (data.data || []).map((p) => ({
    id: p.id,
    name: p.name || p.id,
    accessToken: p.access_token || '',
    instagram: p.instagram_business_account
      ? {
          id: p.instagram_business_account.id,
          username: p.instagram_business_account.username || p.instagram_business_account.id,
        }
      : null,
  }));
  const instagramList = [];
  for (const page of pages) {
    if (page.instagram) {
      instagramList.push({
        id: page.instagram.id,
        username: page.instagram.username,
        pageId: page.id,
        pageName: page.name,
        accessToken: page.accessToken,
      });
    }
  }
  return { pages, instagram: instagramList };
}

module.exports = {
  getAppConfig,
  getAuthorizationUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchPagesAndInstagram,
};
