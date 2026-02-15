declare global {
  interface Window {
    gtag?: (command: string, ...args: any[]) => void;
  }
}

interface EventParams {
  category?: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

/**
 * Track a custom event in Google Analytics
 * @param eventName - The name of the event
 * @param params - Additional parameters for the event
 */
export const trackEvent = (eventName: string, params?: EventParams) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', eventName, params);
  }
};

/**
 * Track a page view
 * @param path - The page path to track
 */
export const trackPageView = (path: string) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('config', 'G-DK9FJVGY7J', {
      page_path: path,
    });
  }
};

/**
 * Track a product view
 */
export const trackProductView = (productName: string, productId: string, category?: string) => {
  trackEvent('view_item', {
    item_name: productName,
    item_id: productId,
    item_category: category,
  });
};

/**
 * Track adding item to cart
 */
export const trackAddToCart = (productName: string, productId: string, value: number) => {
  trackEvent('add_to_cart', {
    item_name: productName,
    item_id: productId,
    value: value,
    currency: 'USD',
  });
};

/**
 * Track beginning checkout
 */
export const trackBeginCheckout = (value: number, items: any[]) => {
  trackEvent('begin_checkout', {
    value: value,
    currency: 'USD',
    items: items,
  });
};

/**
 * Track a purchase
 */
export const trackPurchase = (transactionId: string, value: number, items: any[]) => {
  trackEvent('purchase', {
    transaction_id: transactionId,
    value: value,
    currency: 'USD',
    items: items,
  });
};

/**
 * Track a search
 */
export const trackSearch = (searchTerm: string) => {
  trackEvent('search', {
    search_term: searchTerm,
  });
};

/**
 * Track form submission
 */
export const trackFormSubmit = (formName: string) => {
  trackEvent('form_submit', {
    form_name: formName,
  });
};

/**
 * Track button click
 */
export const trackButtonClick = (buttonName: string, location?: string) => {
  trackEvent('button_click', {
    button_name: buttonName,
    location: location,
  });
};
