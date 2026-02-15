import { env } from "@/lib/env";
/**
 * Error handling utilities for sanitizing error messages
 * Prevents exposing internal database structure to users
 */

/**
 * Extracts a safe, user-friendly error message from any error object
 * Only logs detailed errors in development mode
 */
export const getErrorMessage = (error: unknown): string => {
  // Log full details in development only
  if (env.DEV && error) {
    console.error('Development error details:', error);
  }
  
  // Return generic message to users in production
  return 'An error occurred. Please try again.';
};

/**
 * Logs errors with context, but only in development mode
 * Prevents information leakage in production
 */
export const logError = (context: string, error: unknown): void => {
  if (env.DEV) {
    console.error(`[${context}]`, error);
  }
};
