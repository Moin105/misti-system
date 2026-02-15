import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface CheckboxOption {
  label: string;
  price: string;
  priceType?: 'fixed' | 'percentage';
}

interface CollapsibleCheckboxGroupProps {
  label: string;
  name: string;
  options: CheckboxOption[];
  selectedOptions: Record<string, boolean>;
  onChange: (key: string, checked: boolean | string) => void;
  isRequired?: boolean;
  formatPrice: (price: number) => string;
  buttonGroupModifier?: number;
}

export const CollapsibleCheckboxGroup = ({
  label,
  name,
  options,
  selectedOptions,
  onChange,
  isRequired,
  formatPrice,
  buttonGroupModifier = 0,
}: CollapsibleCheckboxGroupProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedCount = options.filter(
    (opt) => selectedOptions[`${name}-${opt.label}`]
  ).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors">
          <div className="flex flex-col items-start">
            <span className="text-base font-semibold">
              {options[0]?.label || 'Select options'}
            </span>
            {selectedCount > 0 && (
              <span className="text-sm text-primary">
                {selectedCount} selected
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              isOpen && "transform rotate-180"
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="border-t border-border">
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {options.map((opt) => {
              let displayPrice = parseFloat(opt.price);
              let priceText = '';

              if (parseFloat(opt.price) !== 0) {
                if (opt.priceType === 'percentage') {
                  priceText = `+${opt.price}%`;
                } else {
                  // Apply button group modifier to fixed prices
                  if (buttonGroupModifier > 0) {
                    displayPrice = displayPrice * (1 + buttonGroupModifier / 100);
                  }
                  priceText = `+${formatPrice(displayPrice)}`;
                }
              }

              const optionKey = `${name}-${opt.label}`;
              
              return (
                <div key={opt.label} className="flex items-center space-x-2">
                  <Checkbox
                    id={optionKey}
                    checked={selectedOptions[optionKey] || false}
                    onCheckedChange={(checked) => onChange(optionKey, checked)}
                  />
                  <Label htmlFor={optionKey} className="cursor-pointer flex-1">
                    {opt.label}
                    {priceText && (
                      <span className="ml-2 font-medium text-foreground">
                        {priceText}
                      </span>
                    )}
                  </Label>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
