import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CurrencySelector = () => {
  const { currency, setCurrency } = useCurrency();

  const currencySymbol = currency === "EUR" ? "€" : "$";

  return (
    <Select value={currency} onValueChange={(value) => setCurrency(value as "USD" | "EUR")}>
      <SelectTrigger className="w-[45px] sm:w-[70px] h-9 border-border/60">
        <span className="font-medium">{currencySymbol}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USD">
          <span className="flex items-center gap-2">
            <span>$</span>
            <span>USD</span>
          </span>
        </SelectItem>
        <SelectItem value="EUR">
          <span className="flex items-center gap-2">
            <span>€</span>
            <span>EUR</span>
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;
