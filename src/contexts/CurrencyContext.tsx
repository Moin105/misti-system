import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { useExchangeRates } from "@/hooks/useInitialPageData";

type Currency = "USD" | "EUR";

interface ExchangeRate {
  base_currency: string;
  target_currency: string;
  rate: number;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (price: number, fromCurrency?: Currency) => number;
  formatPrice: (price: number, fromCurrency?: Currency) => string;
  rates: ExchangeRate[];
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>(() => {
    if (typeof window === "undefined") return "USD";
    const saved = window.localStorage.getItem("preferred_currency");
    return (saved as Currency) || "USD";
  });

  // Use consolidated initial page data hook instead of separate query
  const { rates, loading } = useExchangeRates();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("preferred_currency", currency);
  }, [currency]);

  const convertPrice = useCallback((price: number, fromCurrency: Currency = "USD"): number => {
    if (fromCurrency === currency) return price;
    
    const rate = rates.find(
      r => r.base_currency === fromCurrency && r.target_currency === currency
    );
    
    return rate ? price * Number(rate.rate) : price;
  }, [currency, rates]);

  const formatPrice = useCallback((price: number, fromCurrency: Currency = "USD"): string => {
    const converted = convertPrice(price, fromCurrency);
    const symbol = currency === "EUR" ? "€" : "$";
    return `${symbol}${converted.toFixed(2)}`;
  }, [currency, convertPrice]);

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      convertPrice,
      formatPrice,
      rates,
      loading,
    }),
    [currency, convertPrice, formatPrice, rates, loading]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
