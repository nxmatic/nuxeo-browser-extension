import ServiceWorkerComponent from './service-worker-component';

class CookieManager extends ServiceWorkerComponent {
  // eslint-disable-next-line class-methods-use-this
  cookieHeaderOf(url) {
    const scheme = url.protocol.slice(0, -1); // Remove the last character (colon)
    const domain = url.hostname;
    return chrome.cookies.getAll({ domain })
      .then((cookies) => {
        if (!cookies) {
          return {
            domain,
            cookieHeader: ''
          };
        }
        const info = {
          domain,
          cookieHeader: cookies.map((cookie) => {
            if (cookie.secure && scheme !== 'https') {
              return null; // Skip secure cookies if not on https
            }
            if (cookie.httpOnly && !(scheme === 'https' || scheme === 'http')) {
              return null; // Skip httpOnly cookies if not on http or https
            }
            let cookieString = `${cookie.name}=${cookie.value}`;
            if (cookie.secure) {
              cookieString += '; Secure';
            }
            if (cookie.httpOnly) {
              cookieString += '; HttpOnly';
            }
            if (cookie.sameSite) {
              cookieString += `; SameSite=${cookie.sameSite}`;
            }
            return cookieString;
          }).filter(Boolean).join('; ')
        };
        return info;
      });
  }
}

export default CookieManager;
