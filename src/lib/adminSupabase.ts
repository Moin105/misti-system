// Utility to clear service worker cache for specific endpoints
// Used by admin panel to ensure real-time updates after mutations

import { QueryClient } from '@tanstack/react-query';

// Reference to the global query client - will be set from main.tsx
let globalQueryClient: QueryClient | null = null;

export const setQueryClient = (client: QueryClient) => {
  globalQueryClient = client;
};

export const getQueryClient = (): QueryClient | null => globalQueryClient;

// Clear all misti-api-* caches (handles version changes automatically)
const clearAllApiCaches = async (): Promise<number> => {
  if (!('caches' in window)) return 0;
  
  const cacheNames = await caches.keys();
  let deletedCount = 0;
  
  for (const name of cacheNames) {
    if (name.startsWith('misti-api-')) {
      await caches.delete(name);
      deletedCount++;
      console.log(`Cleared cache: ${name}`);
    }
  }
  
  return deletedCount;
};

export const clearAPICache = async (endpoints?: string[]): Promise<void> => {
  if (!('caches' in window)) {
    console.log('Cache API not available');
    return;
  }
  
  try {
    // Clear from all misti-api-* caches (handles version mismatches)
    const cacheNames = await caches.keys();
    const apiCaches = cacheNames.filter(name => name.startsWith('misti-api-'));
    
    let deletedCount = 0;
    for (const cacheName of apiCaches) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const request of keys) {
        if (!endpoints || endpoints.some(ep => request.url.includes(ep))) {
          await cache.delete(request);
          deletedCount++;
        }
      }
    }
    
    if (deletedCount > 0) {
      console.log(`Cleared ${deletedCount} cached API entries from ${apiCaches.length} cache(s)`);
    }
  } catch (error) {
    console.error('Failed to clear API cache:', error);
  }
};

// Clear all API cache entries (nuclear option)
export const clearAllAPICache = async (): Promise<void> => {
  if (!('caches' in window)) {
    return;
  }
  
  try {
    const count = await clearAllApiCaches();
    if (count > 0) {
      console.log(`Cleared ${count} API cache(s)`);
    }
  } catch (error) {
    console.error('Failed to clear all API cache:', error);
  }
};

// Invalidate React Query cache for admin operations
// This ensures all components see fresh data immediately after mutations
export const invalidateAdminQueries = async (queryKeys?: string[]): Promise<void> => {
  if (!globalQueryClient) {
    console.warn('QueryClient not set - React Query cache not invalidated');
    return;
  }
  
  try {
    if (queryKeys && queryKeys.length > 0) {
      // Invalidate specific query keys
      await Promise.all(
        queryKeys.map(key => 
          globalQueryClient!.invalidateQueries({ queryKey: [key] })
        )
      );
      console.log(`Invalidated React Query cache for: ${queryKeys.join(', ')}`);
    } else {
      // Invalidate all queries - nuclear option for admin
      await globalQueryClient.invalidateQueries();
      console.log('Invalidated all React Query cache');
    }
  } catch (error) {
    console.error('Failed to invalidate React Query cache:', error);
  }
};

// Combined utility to clear both service worker cache and React Query cache
export const refreshAdminData = async (
  swEndpoints?: string[], 
  queryKeys?: string[]
): Promise<void> => {
  await Promise.all([
    clearAPICache(swEndpoints),
    invalidateAdminQueries(queryKeys)
  ]);
};
