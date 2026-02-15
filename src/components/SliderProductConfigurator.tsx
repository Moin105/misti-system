import { useState, useEffect, useRef } from "react";
import { formatNumber } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Headphones, Clock, Package, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ProductSupportSection } from "./ProductSupportSection";
import { CollapsibleCheckboxGroup } from "./CollapsibleCheckboxGroup";
import { safeParsePrice } from "@/lib/priceUtils";

interface PricingBracket {
  start: number;
  end: number;
  price: number;
}

interface SliderConfig {
  min_value: number;
  max_value: number;
  step: number;
  default_start: number;
  default_end: number;
  start_label: string;
  end_label: string;
  price_per_step?: number; // Legacy support
  pricing_brackets?: PricingBracket[];
  estimated_time_per_step: number;
}

interface ProductOption {
  id: string;
  name: string;
  label: string;
  option_type: "radio" | "checkbox" | "number" | "text" | "select" | "button_group";
  is_required: boolean;
  options?: any[];
  price_modifier: number;
  price_modifier_type: string;
  default_value?: string;
  min_value?: number;
  max_value?: number;
}

interface SliderProductConfiguratorProps {
  sliderConfig: SliderConfig;
  basePrice: number;
  productOptions: ProductOption[];
  productName: string;
  onAddToCart: (selectedOptions: Record<string, any>, totalPrice: number) => Promise<boolean>;
  productData?: {
    start_time_text?: string;
    start_time_value?: string;
    delivery_text?: string;
    delivery_value?: string;
  };
}

// Helper function to calculate step markers - simplified for small ranges
const calculateStepMarkers = (min: number, max: number, step: number): number[] => {
  const range = max - min;
  const totalSteps = range / step;

  // For small ranges (≤5 steps), show only min and max
  if (totalSteps <= 5) {
    return [min, max];
  }

  // For medium ranges (6-10 steps), show 3 markers
  if (totalSteps <= 10) {
    return [min, Math.round((min + max) / 2), max];
  }

  // For larger ranges, calculate 5 markers
  let roundTo: number;
  if (range <= 20) {
    roundTo = 1;
  } else if (range <= 100) {
    roundTo = 5;
  } else if (range <= 500) {
    roundTo = 10;
  } else if (range <= 1000) {
    roundTo = 25;
  } else if (range <= 5000) {
    roundTo = 50;
  } else {
    roundTo = 100;
  }

  const interval = range / 4;

  const markers = [
    min,
    Math.round((min + interval) / roundTo) * roundTo,
    Math.round((min + interval * 2) / roundTo) * roundTo,
    Math.round((min + interval * 3) / roundTo) * roundTo,
    max,
  ];

  // Deduplicate markers
  return [...new Set(markers)];
};

const SliderProductConfigurator = ({
  sliderConfig,
  basePrice,
  productOptions,
  productName,
  onAddToCart,
  productData,
}: SliderProductConfiguratorProps) => {
  const [startValue, setStartValue] = useState(sliderConfig.default_start);
  const [endValue, setEndValue] = useState(sliderConfig.default_end);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, any>>({});
  const [totalPrice, setTotalPrice] = useState(basePrice);
  const [buttonGroupModifier, setButtonGroupModifier] = useState(0);
  const { formatPrice } = useCurrency();

  // Manual input state for range slider
  const [editingField, setEditingField] = useState<"start" | "end" | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Validate and set manual input value
  const handleManualInputSubmit = () => {
    const parsed = parseInt(inputValue.replace(/,/g, ""), 10);
    if (!isNaN(parsed) && editingField) {
      // Clamp to min/max
      const clamped = Math.max(sliderConfig.min_value, Math.min(sliderConfig.max_value, parsed));
      // Snap to nearest step
      const snapped =
        Math.round((clamped - sliderConfig.min_value) / sliderConfig.step) * sliderConfig.step + sliderConfig.min_value;

      if (editingField === "start") {
        // Ensure start doesn't exceed end
        setStartValue(Math.min(snapped, endValue));
      } else {
        // Ensure end doesn't go below start
        setEndValue(Math.max(snapped, startValue));
      }
    }
    setEditingField(null);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleManualInputSubmit();
    } else if (e.key === "Escape") {
      setEditingField(null);
    }
  };

  const startEditing = (field: "start" | "end") => {
    setInputValue(field === "start" ? startValue.toString() : endValue.toString());
    setEditingField(field);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Calculate the slider price based on brackets or legacy method
  const calculateSliderPrice = (start: number, end: number): number => {
    if (sliderConfig.pricing_brackets && sliderConfig.pricing_brackets.length > 0) {
      const selectedStart = Math.min(start, end);
      const selectedEnd = Math.max(start, end);

      // First, try to find an exact bracket match - ensure number comparison
      const exactMatch = sliderConfig.pricing_brackets.find(
        (bracket) => Number(bracket.start) === selectedStart && Number(bracket.end) === selectedEnd,
      );

      if (exactMatch) {
        return Number(exactMatch.price);
      }

      // Find all brackets that overlap with the selected range (excluding full containers)
      const overlappingBrackets = sliderConfig.pricing_brackets
        .filter((bracket) => {
          const bStart = Number(bracket.start);
          const bEnd = Number(bracket.end);

          // Exclude if this bracket fully contains our selection
          if (bStart <= selectedStart && bEnd >= selectedEnd) {
            return false;
          }

          // A bracket overlaps if its range intersects with our selection
          return bStart < selectedEnd && bEnd > selectedStart;
        })
        .sort((a, b) => a.start - b.start);

      // If no overlapping brackets, find a containing bracket to calculate from
      if (overlappingBrackets.length === 0) {
        const containingBracket = sliderConfig.pricing_brackets.find(
          (bracket) => Number(bracket.start) <= selectedStart && Number(bracket.end) >= selectedEnd,
        );

        if (containingBracket) {
          const bracketRange = containingBracket.end - containingBracket.start;
          const pricePerLevel = containingBracket.price / bracketRange;
          const selectedRange = selectedEnd - selectedStart;
          return selectedRange * pricePerLevel;
        }

        return 0;
      }

      // Calculate the cost for each overlapping portion
      let totalCost = 0;

      overlappingBrackets.forEach((bracket) => {
        // Find the overlapping portion
        const overlapStart = Math.max(selectedStart, bracket.start);
        const overlapEnd = Math.min(selectedEnd, bracket.end);
        const overlapLevels = overlapEnd - overlapStart;

        // Calculate per-level rate for this bracket
        const bracketRange = bracket.end - bracket.start;
        const pricePerLevel = bracket.price / bracketRange;

        // Add the cost for this portion
        totalCost += overlapLevels * pricePerLevel;
      });

      return totalCost;
    } else {
      // Legacy: simple per-step pricing
      const sliderSteps = Math.abs(end - start) / sliderConfig.step;
      return sliderSteps * (sliderConfig.price_per_step || 0);
    }
  };

  const sliderPrice = calculateSliderPrice(startValue, endValue);
  const sliderSteps = Math.abs(endValue - startValue) / sliderConfig.step;

  // Calculate estimated time
  const estimatedDays = Math.ceil(sliderSteps * sliderConfig.estimated_time_per_step);

  useEffect(() => {
    calculateTotalPrice();
  }, [startValue, endValue, selectedOptions]);

  const calculateTotalPrice = () => {
    let price = basePrice + sliderPrice;

    // First pass: Find button group percentage modifier
    let buttonGroupPercentageModifier = 0;
    productOptions.forEach((option) => {
      if (option.option_type === "button_group" && selectedOptions[option.name]) {
        const opts = option.options as any;
        if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === "object") {
          const selectedOpt = opts.find((o: any) => o.label === selectedOptions[option.name]);
          if (selectedOpt && selectedOpt.priceType === "percentage" && safeParsePrice(selectedOpt.price) !== 0) {
            buttonGroupPercentageModifier += safeParsePrice(selectedOpt.price);
          }
        }
      }
    });

    // Update state for UI display
    setButtonGroupModifier(buttonGroupPercentageModifier);

    // Second pass: Apply option prices with button group modifier
    productOptions.forEach((option) => {
      if (option.option_type === "checkbox") {
        const opts = option.options as any;
        if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === "object") {
          // New format - multiple checkboxes with individual prices
          opts.forEach((opt: any) => {
            if (selectedOptions[`${option.name}-${opt.label}`] && safeParsePrice(opt.price) !== 0) {
              let optionPrice = 0;
              if (opt.priceType === "percentage") {
                // Apply percentage to running total (like button groups)
                optionPrice = (price * safeParsePrice(opt.price)) / 100;
              } else {
                optionPrice = safeParsePrice(opt.price);
                // Apply button group percentage modifier to fixed prices
                if (buttonGroupPercentageModifier > 0) {
                  optionPrice = optionPrice * (1 + buttonGroupPercentageModifier / 100);
                }
              }
              price += optionPrice;
            }
          });
        } else if (selectedOptions[option.id] && Array.isArray(selectedOptions[option.id])) {
          // Old format - array of values
          selectedOptions[option.id].forEach((val: string) => {
            const checkboxOption = option.options?.find((o: any) => o.value === val);
            if (checkboxOption) {
              let optionPrice = 0;
              if (option.price_modifier_type === "percentage") {
                // Calculate from effective slider price that includes button group modifier
                const effectiveSliderPrice = sliderPrice * (1 + buttonGroupPercentageModifier / 100);
                optionPrice = (effectiveSliderPrice * checkboxOption.price_modifier) / 100;
              } else {
                optionPrice = checkboxOption.price_modifier || 0;
                // Apply button group percentage modifier to fixed prices
                if (buttonGroupPercentageModifier > 0) {
                  optionPrice = optionPrice * (1 + buttonGroupPercentageModifier / 100);
                }
              }
              price += optionPrice;
            }
          });
        } else if (selectedOptions[option.name]) {
          // Single checkbox
          let optionPrice = 0;
          if (option.price_modifier_type === "percentage") {
            // Calculate from effective slider price that includes button group modifier
            const effectiveSliderPrice = sliderPrice * (1 + buttonGroupPercentageModifier / 100);
            optionPrice = (effectiveSliderPrice * option.price_modifier) / 100;
          } else {
            optionPrice = option.price_modifier;
            // Apply button group percentage modifier to fixed prices
            if (buttonGroupPercentageModifier > 0) {
              optionPrice = optionPrice * (1 + buttonGroupPercentageModifier / 100);
            }
          }
          price += optionPrice;
        }
      } else if (
        (option.option_type === "select" || option.option_type === "button_group" || option.option_type === "radio") &&
        selectedOptions[option.name]
      ) {
        // Find the selected option and apply its price
        const opts = option.options as any;
        if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === "object") {
          const selectedOpt = opts.find((o: any) => o.label === selectedOptions[option.name]);
          if (selectedOpt && selectedOpt.price && safeParsePrice(selectedOpt.price) !== 0) {
            let optionPrice = 0;

            // Button group percentages apply to current total (base + slider + options so far)
            if (option.option_type === "button_group" && selectedOpt.priceType === "percentage") {
              optionPrice = (price * safeParsePrice(selectedOpt.price)) / 100;
            } else if (selectedOpt.priceType === "percentage") {
              // Apply percentage to running total (like button groups)
              optionPrice = (price * safeParsePrice(selectedOpt.price)) / 100;
            } else {
              optionPrice = safeParsePrice(selectedOpt.price);
              // Don't apply button group modifier to the button group itself
              if (option.option_type !== "button_group" && buttonGroupPercentageModifier > 0) {
                optionPrice = optionPrice * (1 + buttonGroupPercentageModifier / 100);
              }
            }
            price += optionPrice;
          }
        } else if (option.option_type === "radio") {
          // Old format radio
          const selectedRadioOption = option.options?.find((o: any) => o.value === selectedOptions[option.id]);
          if (selectedRadioOption) {
            let optionPrice = 0;
            if (option.price_modifier_type === "percentage") {
              // Calculate from effective slider price that includes button group modifier
              const effectiveSliderPrice = sliderPrice * (1 + buttonGroupPercentageModifier / 100);
              optionPrice = (effectiveSliderPrice * selectedRadioOption.price_modifier) / 100;
            } else {
              optionPrice = selectedRadioOption.price_modifier || 0;
              // Apply button group percentage modifier to fixed prices
              if (buttonGroupPercentageModifier > 0) {
                optionPrice = optionPrice * (1 + buttonGroupPercentageModifier / 100);
              }
            }
            price += optionPrice;
          }
        }
      } else if (option.option_type === "text" || option.option_type === "number") {
        // Text and number fields with global price modifier
        if (option.price_modifier !== 0) {
          let optionPrice = 0;
          if (option.price_modifier_type === "percentage") {
            optionPrice = (basePrice * option.price_modifier) / 100;
          } else {
            optionPrice = option.price_modifier;
          }
          // Apply button group percentage modifier
          if (buttonGroupPercentageModifier > 0) {
            optionPrice = optionPrice * (1 + buttonGroupPercentageModifier / 100);
          }
          price += optionPrice;
        }
      }
    });

    setTotalPrice(price);
  };

  const handleSliderChange = (values: number[]) => {
    if (values.length === 2) {
      setStartValue(values[0]);
      setEndValue(values[1]);
    }
  };

  const handleOptionChange = (optionName: string, value: any) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: value,
    }));
  };

  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    if (isAdding) return;
    setIsAdding(true);
    try {
      const configOptions = {
        ...selectedOptions,
        slider_start: startValue,
        slider_end: endValue,
        slider_range: `${sliderConfig.start_label}: ${startValue} - ${sliderConfig.end_label}: ${endValue}`,
      };
      await onAddToCart(configOptions, totalPrice);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-card/80 backdrop-blur-md border border-border p-6 relative overflow-hidden rounded-xl group hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-all duration-300">
      {/* Top gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
      {/* Bottom subtle line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-10 h-10 border-l-2 border-t-2 border-blue-500/40 rounded-tl-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute top-0 right-0 w-10 h-10 border-r-2 border-t-2 border-purple-500/40 rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 left-0 w-10 h-10 border-l-2 border-b-2 border-purple-500/40 rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 right-0 w-10 h-10 border-r-2 border-b-2 border-blue-500/40 rounded-br-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        Configure Your Order
      </h3>
      <div className="h-0.5 w-16 bg-gradient-to-r from-blue-500 to-purple-500 mb-4 rounded-full" />

      {/* Slider Section */}
      <div className="space-y-4 mb-6">
        <div>
          <Label className="text-base font-semibold mb-2 block">Select Range</Label>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div
                className="flex flex-col items-center justify-center bg-blue-500/10 border border-white/10 rounded-lg px-4 py-3 cursor-pointer hover:bg-blue-500/20 transition-colors group relative"
                onClick={() => editingField !== "start" && startEditing("start")}
                title="Click to type a value"
              >
                <Label className="text-xs text-muted-foreground mb-1">{sliderConfig.start_label}</Label>
                {editingField === "start" ? (
                  <Input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handleManualInputSubmit}
                    onKeyDown={handleInputKeyDown}
                    className="w-20 h-7 text-center text-lg font-bold bg-background/50 border-primary"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="text-xl font-bold text-primary-foreground">{formatNumber(startValue)}</span>
                    <Edit2 className="w-3 h-3 absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
              </div>
              <div
                className="flex flex-col items-center justify-center bg-blue-500/10 border border-white/10 rounded-lg px-4 py-3 cursor-pointer hover:bg-blue-500/20 transition-colors group relative"
                onClick={() => editingField !== "end" && startEditing("end")}
                title="Click to type a value"
              >
                <Label className="text-xs text-muted-foreground mb-1">{sliderConfig.end_label}</Label>
                {editingField === "end" ? (
                  <Input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handleManualInputSubmit}
                    onKeyDown={handleInputKeyDown}
                    className="w-20 h-7 text-center text-lg font-bold bg-background/50 border-primary"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="text-xl font-bold text-primary-foreground">{formatNumber(endValue)}</span>
                    <Edit2 className="w-3 h-3 absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
              </div>
            </div>

            <Slider
              min={sliderConfig.min_value}
              max={sliderConfig.max_value}
              step={sliderConfig.step}
              value={[startValue, endValue]}
              onValueChange={handleSliderChange}
              minStepsBetweenThumbs={1}
              className="cursor-pointer"
              trackClassName="bg-slate-700"
              rangeClassName="bg-gradient-to-r from-blue-500 to-purple-500"
            />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground px-1">
              {calculateStepMarkers(sliderConfig.min_value, sliderConfig.max_value, sliderConfig.step).map(
                (value, index, array) => (
                  <span key={index} className={index > 0 && index < array.length - 1 ? "flex-1 text-center" : ""}>
                    {formatNumber(value)}
                  </span>
                ),
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Estimated time: <span className="font-semibold text-foreground">{estimatedDays} days</span>
              {" • "}
              Range:{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(Math.abs(endValue - startValue))} {sliderConfig.step === 1 ? "levels" : "steps"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Options */}
      {productOptions.length > 0 && (
        <div className="space-y-4 mb-6">
          {productOptions.map((option) => {
            switch (option.option_type) {
              case "select":
                const selectOptions = (option.options as any) || [];
                const isSelectNewFormat =
                  Array.isArray(selectOptions) && selectOptions.length > 0 && typeof selectOptions[0] === "object";
                return (
                  <div key={option.id}>
                    <Label className="text-base font-semibold mb-2 block">
                      {option.label}
                      {option.is_required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Select
                      value={selectedOptions[option.name] || ""}
                      onValueChange={(value) => handleOptionChange(option.name, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={`Select ${option.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {isSelectNewFormat
                          ? selectOptions.map((opt: any) => {
                              if (parseFloat(opt.price) === 0) {
                                return (
                                  <SelectItem key={opt.label} value={opt.label}>
                                    {opt.label}
                                  </SelectItem>
                                );
                              }

                              let displayPrice = parseFloat(opt.price);
                              let priceText = "";

                              if (opt.priceType === "percentage") {
                                priceText = `+${opt.price}%`;
                              } else {
                                // Apply button group modifier to fixed prices
                                if (buttonGroupModifier > 0) {
                                  displayPrice = displayPrice * (1 + buttonGroupModifier / 100);
                                }
                                priceText = `+${formatPrice(displayPrice)}`;
                              }

                              return (
                                <SelectItem key={opt.label} value={opt.label}>
                                  <span className="flex items-center justify-between w-full">
                                    <span>{opt.label}</span>
                                    <span className="ml-3 font-semibold text-blue-400">{priceText}</span>
                                  </span>
                                </SelectItem>
                              );
                            })
                          : selectOptions.map((opt: string) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                );

              case "checkbox":
                const checkboxOptions = (option.options as any) || [];
                const isCheckboxNewFormat =
                  Array.isArray(checkboxOptions) &&
                  checkboxOptions.length > 0 &&
                  typeof checkboxOptions[0] === "object";

                if (isCheckboxNewFormat) {
                  return (
                    <CollapsibleCheckboxGroup
                      key={option.id}
                      label={option.label}
                      name={option.name}
                      options={checkboxOptions}
                      selectedOptions={selectedOptions}
                      onChange={handleOptionChange}
                      isRequired={option.is_required}
                      formatPrice={formatPrice}
                      buttonGroupModifier={buttonGroupModifier}
                    />
                  );
                }

                // Old single checkbox format
                return (
                  <div key={option.id}>
                    <Label className="text-base font-semibold mb-2 block">
                      {option.label}
                      {option.is_required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={option.name}
                        checked={selectedOptions[option.name] || false}
                        onCheckedChange={(checked) => handleOptionChange(option.name, checked)}
                      />
                      <Label htmlFor={option.name} className="cursor-pointer">
                        {option.label}
                        {option.price_modifier > 0 && (
                          <span className="ml-2 font-medium text-foreground">
                            +
                            {option.price_modifier_type === "percentage"
                              ? `${option.price_modifier}%`
                              : formatPrice(option.price_modifier)}
                          </span>
                        )}
                      </Label>
                    </div>
                  </div>
                );

              case "button_group":
                const buttonGroupOptions = (option.options as any) || [];
                const isButtonNewFormat =
                  Array.isArray(buttonGroupOptions) &&
                  buttonGroupOptions.length > 0 &&
                  typeof buttonGroupOptions[0] === "object";
                
                // Calculate grid columns based on option count and label length
                const getGridCols = () => {
                  const count = buttonGroupOptions.length;
                  
                  // Match grid columns to actual count for 1-3 items
                  if (count === 1) return 'grid-cols-1';
                  if (count === 2) return 'grid-cols-2';
                  if (count === 3) return 'grid-cols-3';
                  
                  // For 4+ items, use 2 or 3 columns based on label length
                  const labels = isButtonNewFormat 
                    ? buttonGroupOptions.map((o: any) => o.label || '') 
                    : buttonGroupOptions;
                  const avgLength = labels.reduce((sum: number, l: string) => sum + l.length, 0) / labels.length;
                  
                  if (avgLength > 12 || count > 6) return 'grid-cols-2';
                  return 'grid-cols-3';
                };
                
                return (
                  <div key={option.id}>
                    <Label className="text-base font-semibold mb-2 block">
                      {option.label}
                      {option.is_required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <div className={`grid ${getGridCols()} gap-2`}>
                      {isButtonNewFormat
                        ? buttonGroupOptions.map((opt: any, index: number) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => handleOptionChange(option.name, opt.label)}
                              className={`w-full px-4 py-2.5 text-sm font-medium transition-all duration-300 rounded-lg text-center ${
                                selectedOptions[option.name] === opt.label
                                  ? "bg-blue-500/10 border-2 border-blue-400/30 text-primary-foreground"
                                  : "bg-background/50 border border-white/5 hover:bg-blue-500/5"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))
                        : buttonGroupOptions.map((opt: string, index: number) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleOptionChange(option.name, opt)}
                              className={`w-full px-4 py-2.5 text-sm font-medium transition-all duration-300 rounded-lg text-center ${
                                selectedOptions[option.name] === opt
                                  ? "bg-blue-500/10 border-2 border-blue-400/30 text-primary-foreground"
                                  : "bg-background/50 border border-white/5 hover:bg-blue-500/5"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                    </div>
                  </div>
                );

              case "number":
                return (
                  <div key={option.id}>
                    <Label className="text-base font-semibold mb-2 block">
                      {option.label}
                      {option.is_required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Input
                      type="number"
                      value={selectedOptions[option.name] || option.default_value || ""}
                      onChange={(e) => handleOptionChange(option.name, e.target.value)}
                      min={option.min_value || undefined}
                      max={option.max_value || undefined}
                      placeholder={option.label}
                    />
                  </div>
                );

              case "text":
                return (
                  <div key={option.id}>
                    <Label className="text-base font-semibold mb-2 block">
                      {option.label}
                      {option.is_required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Input
                      type="text"
                      value={selectedOptions[option.name] || option.default_value || ""}
                      onChange={(e) => handleOptionChange(option.name, e.target.value)}
                      placeholder={option.label}
                    />
                  </div>
                );

              default:
                return null;
            }
          })}
        </div>
      )}

      {/* Start Time and Delivery Info */}
      {productData && (
        <div className="grid grid-cols-2 gap-4 mb-6 pb-4 border-b border-border">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Start Time:</div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">{productData.start_time_text || "15 minutes"}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Delivery:</div>
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">{productData.delivery_text || "Flexible"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Price Summary - Redesigned */}
      <div className="relative border-t border-border/30 pt-5 mb-6 -mx-6 px-6">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <div className="space-y-3">
          {/* Base Price Row */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/70 font-medium">Base Price</span>
            <span className="text-sm font-bold text-foreground">{formatPrice(basePrice)}</span>
          </div>
          
          {/* Range Price Row - with context badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium">Range Price</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {Math.abs(endValue - startValue)} levels
              </span>
            </div>
            <span className="text-sm font-semibold text-foreground">{formatPrice(sliderPrice)}</span>
          </div>
          
          {/* Options Row */}
          {Object.keys(selectedOptions).length > 0 && (totalPrice - basePrice - sliderPrice) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">Options</span>
              <span className="text-sm font-semibold text-primary">+{formatPrice(totalPrice - basePrice - sliderPrice)}</span>
            </div>
          )}
          
          {/* Divider before total */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent my-2" />
          
          {/* Total Row - Prominent */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Total
            </span>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* CTA Buttons - Glassmorphism */}
      <div className="space-y-3">
        <Button 
          className="w-full bg-primary/20 backdrop-blur-sm border border-primary/40 text-primary hover:bg-primary/30 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300" 
          size="lg" 
          onClick={handleAddToCart}
          disabled={isAdding}
        >
          {isAdding ? (
            <>
              <svg className="w-5 h-5 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              Adding...
            </>
          ) : (
            <>
              <ShoppingCart className="w-5 h-5 mr-2" />
              Add to Cart - {formatPrice(totalPrice)}
            </>
          )}
        </Button>
      </div>

      <ProductSupportSection productName={productName} />
    </div>
  );
};

export default SliderProductConfigurator;
