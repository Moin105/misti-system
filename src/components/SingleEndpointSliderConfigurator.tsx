import { useState, useEffect, useRef } from "react";
import { formatNumber } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Headphones, Zap, Clock, Package, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ProductSupportSection } from "./ProductSupportSection";
import { CollapsibleCheckboxGroup } from "./CollapsibleCheckboxGroup";
import { safeParsePrice } from "@/lib/priceUtils";

interface PricingBracket {
  start: number;
  end: number;
  price: number;
}

interface DynamicOption {
  trigger_value: number;
  action: "show_option" | "apply_discount" | "unlock_feature";
  option_name?: string;
  discount_percent?: number;
  message?: string;
}

interface SingleSliderConfig {
  slider_type: "single";
  min_value: number;
  max_value: number;
  step: number;
  default_value: number;
  value_label: string;
  price_label?: string;
  price_per_step?: number;
  pricing_brackets?: PricingBracket[];
  estimated_time_per_step: number;
  dynamic_options?: DynamicOption[];
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

interface SingleEndpointSliderConfiguratorProps {
  sliderConfig: SingleSliderConfig;
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

const SingleEndpointSliderConfigurator = ({
  sliderConfig,
  basePrice,
  productOptions,
  productName,
  onAddToCart,
  productData,
}: SingleEndpointSliderConfiguratorProps) => {
  const [currentValue, setCurrentValue] = useState(sliderConfig.default_value);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, any>>({});
  const [totalPrice, setTotalPrice] = useState(basePrice);
  const [visibleOptions, setVisibleOptions] = useState<Set<string>>(new Set());
  const [activeDiscounts, setActiveDiscounts] = useState<DynamicOption[]>([]);
  const [activeMessages, setActiveMessages] = useState<string[]>([]);
  const [buttonGroupModifier, setButtonGroupModifier] = useState(0);
  const { formatPrice } = useCurrency();

  // Manual input state
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Validate and set manual input value
  const handleManualInputSubmit = () => {
    const parsed = parseInt(inputValue.replace(/,/g, ""), 10);
    if (!isNaN(parsed)) {
      // Clamp to min/max
      const clamped = Math.max(sliderConfig.min_value, Math.min(sliderConfig.max_value, parsed));
      // Snap to nearest step
      const snapped =
        Math.round((clamped - sliderConfig.min_value) / sliderConfig.step) * sliderConfig.step + sliderConfig.min_value;
      setCurrentValue(snapped);
    }
    setIsEditingValue(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleManualInputSubmit();
    } else if (e.key === "Escape") {
      setIsEditingValue(false);
    }
  };

  const startEditing = () => {
    setInputValue(currentValue.toString());
    setIsEditingValue(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Calculate the slider price based on current value
  const calculateSliderPrice = (value: number): number => {
    if (sliderConfig.pricing_brackets && sliderConfig.pricing_brackets.length > 0) {
      // First try to find an exact bracket match
      let bracket = sliderConfig.pricing_brackets.find((b) => value >= b.start && value <= b.end);

      // If no exact match, find the bracket with the highest end value that the current value exceeds
      // This handles cases where slider max_value > bracket end value
      if (!bracket) {
        const sortedBrackets = [...sliderConfig.pricing_brackets].sort((a, b) => b.end - a.end);
        bracket = sortedBrackets.find((b) => value >= b.start) || sortedBrackets[0];
      }

      if (bracket) {
        // If base price is set, include it in per-unit calculation
        if (basePrice > 0) {
          return (basePrice + bracket.price) * value;
        }
        // Otherwise just use bracket price
        return bracket.price * value;
      }

      return 0;
    } else {
      const steps = (value - sliderConfig.min_value) / sliderConfig.step;
      return steps * (sliderConfig.price_per_step || 0);
    }
  };

  const sliderPrice = calculateSliderPrice(currentValue);
  const steps = (currentValue - sliderConfig.min_value) / sliderConfig.step;
  const estimatedDays = Math.ceil(steps * sliderConfig.estimated_time_per_step);

  // Process dynamic options when slider value changes
  useEffect(() => {
    if (sliderConfig.dynamic_options) {
      const newVisibleOptions = new Set(visibleOptions);
      const newActiveDiscounts: DynamicOption[] = [];
      const newMessages: string[] = [];

      sliderConfig.dynamic_options.forEach((dynOption) => {
        if (currentValue >= dynOption.trigger_value) {
          if (dynOption.action === "show_option" && dynOption.option_name) {
            newVisibleOptions.add(dynOption.option_name);
          } else if (dynOption.action === "apply_discount" && dynOption.discount_percent) {
            newActiveDiscounts.push(dynOption);
          }

          if (dynOption.message) {
            newMessages.push(dynOption.message);
          }
        }
      });

      setVisibleOptions(newVisibleOptions);
      setActiveDiscounts(newActiveDiscounts);
      setActiveMessages(newMessages);
    }
  }, [currentValue, sliderConfig.dynamic_options]);

  useEffect(() => {
    calculateTotalPrice();
  }, [currentValue, selectedOptions, activeDiscounts]);

  const calculateTotalPrice = () => {
    // If base price is already included in slider price calculation, don't add it again
    let price =
      basePrice > 0 && sliderConfig.pricing_brackets && sliderConfig.pricing_brackets.length > 0
        ? sliderPrice
        : basePrice + sliderPrice;

    // Apply discounts from dynamic options
    let totalDiscountPercent = 0;
    activeDiscounts.forEach((discount) => {
      totalDiscountPercent += discount.discount_percent || 0;
    });

    // First pass: Find button group percentage modifier
    let buttonGroupPercentageModifier = 0;
    productOptions.forEach((option) => {
      if (visibleOptions.size === 0 || visibleOptions.has(option.name)) {
        if (option.option_type === "button_group" && selectedOptions[option.name]) {
          const opts = option.options as any;
          if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === "object") {
            const selectedOpt = opts.find((o: any) => o.label === selectedOptions[option.name]);
            if (selectedOpt && selectedOpt.priceType === "percentage" && safeParsePrice(selectedOpt.price) !== 0) {
              buttonGroupPercentageModifier += safeParsePrice(selectedOpt.price);
            }
          }
        }
      }
    });

    // Update state for UI display
    setButtonGroupModifier(buttonGroupPercentageModifier);

    // Second pass: Calculate product options prices (multiplied by slider value)
    productOptions.forEach((option) => {
      // Only calculate if option is visible or no visibility restrictions
      if (visibleOptions.size === 0 || visibleOptions.has(option.name)) {
        if (option.option_type === "checkbox") {
          const opts = option.options as any;
          if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === "object") {
            opts.forEach((opt: any) => {
              if (selectedOptions[`${option.name}-${opt.label}`] && safeParsePrice(opt.price) !== 0) {
                let optionPrice = 0;
                if (opt.priceType === "percentage") {
                  // Apply percentage to running total (like button groups)
                  optionPrice = (price * safeParsePrice(opt.price)) / 100;
                } else {
                  optionPrice = safeParsePrice(opt.price) * currentValue;
                  // Apply button group percentage modifier to fixed prices
                  if (buttonGroupPercentageModifier > 0) {
                    optionPrice = optionPrice * (1 + buttonGroupPercentageModifier / 100);
                  }
                }
                price += optionPrice;
              }
            });
          } else if (selectedOptions[option.name]) {
            let optionPrice = 0;
            if (option.price_modifier_type === "percentage") {
              // Calculate from effective base that includes button group modifier
              const effectiveBase = basePrice * (1 + buttonGroupPercentageModifier / 100);
              optionPrice = ((effectiveBase * option.price_modifier) / 100) * currentValue;
            } else {
              optionPrice = option.price_modifier * currentValue;
              // Apply button group percentage modifier to fixed prices
              if (buttonGroupPercentageModifier > 0) {
                optionPrice = optionPrice * (1 + buttonGroupPercentageModifier / 100);
              }
            }
            price += optionPrice;
          }
        } else if (
          (option.option_type === "select" ||
            option.option_type === "button_group" ||
            option.option_type === "radio") &&
          selectedOptions[option.name]
        ) {
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
                optionPrice = safeParsePrice(selectedOpt.price) * currentValue;
                // Apply button group percentage modifier to fixed prices
                if (buttonGroupPercentageModifier > 0) {
                  optionPrice = optionPrice * (1 + buttonGroupPercentageModifier / 100);
                }
              }
              price += optionPrice;
            }
          }
        } else if (option.option_type === "text" || option.option_type === "number") {
          if (option.price_modifier !== 0) {
            let optionPrice = 0;
            if (option.price_modifier_type === "percentage") {
              // Calculate from effective base that includes button group modifier
              const effectiveBase = basePrice * (1 + buttonGroupPercentageModifier / 100);
              optionPrice = ((effectiveBase * option.price_modifier) / 100) * currentValue;
            } else {
              optionPrice = option.price_modifier * currentValue;
              // Apply button group percentage modifier to fixed prices
              if (buttonGroupPercentageModifier > 0) {
                optionPrice = optionPrice * (1 + buttonGroupPercentageModifier / 100);
              }
            }
            price += optionPrice;
          }
        }
      }
    });

    // Apply total discount
    if (totalDiscountPercent > 0) {
      price = price * (1 - totalDiscountPercent / 100);
    }

    setTotalPrice(price);
  };

  const handleSliderChange = (values: number[]) => {
    if (values.length === 1) {
      setCurrentValue(values[0]);
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
        slider_value: currentValue,
        slider_config: `${sliderConfig.value_label}: ${currentValue}`,
      };
      await onAddToCart(configOptions, totalPrice);
    } finally {
      setIsAdding(false);
    }
  };

  // Filter options based on visibility
  const getVisibleProductOptions = () => {
    if (visibleOptions.size === 0) return productOptions;
    return productOptions.filter((opt) => visibleOptions.has(opt.name));
  };

  const visibleProductOptions = getVisibleProductOptions();

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

      {/* Active Messages */}
      {activeMessages.length > 0 && (
        <div className="space-y-2 mb-4">
          {activeMessages.map((message, idx) => (
            <Alert key={idx} className="border-accent/50 bg-accent/5">
              <Zap className="h-4 w-4 text-accent" />
              <AlertDescription className="text-sm font-medium">{message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Active Discounts Display */}
      {activeDiscounts.length > 0 && (
        <div className="mb-4">
          <Alert className="border-accent/50 bg-accent/5">
            <Zap className="h-4 w-4 text-accent" />
            <AlertDescription className="text-sm font-medium">
              {activeDiscounts.reduce((sum, d) => sum + (d.discount_percent || 0), 0)}% discount applied!
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Single Slider Section */}
      <div className="space-y-4 mb-6">
        <div>
          <Label className="text-base font-semibold mb-2 block">Select {sliderConfig.value_label}</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-center mb-3">
              <div
                className="flex flex-col items-center justify-center bg-blue-500/10 border border-white/10 rounded-lg px-6 py-3 min-w-[120px] cursor-pointer hover:bg-blue-500/20 transition-colors group relative"
                onClick={() => !isEditingValue && startEditing()}
                title="Click to type a value"
              >
                <span className="text-xs text-muted-foreground mb-1">{sliderConfig.value_label}</span>
                {isEditingValue ? (
                  <Input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handleManualInputSubmit}
                    onKeyDown={handleInputKeyDown}
                    className="w-24 h-8 text-center text-xl font-bold bg-background/50 border-primary"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="text-2xl font-bold text-primary-foreground">{formatNumber(currentValue)}</span>
                    <Edit2 className="w-3 h-3 absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
              </div>
            </div>

            <Slider
              min={sliderConfig.min_value}
              max={sliderConfig.max_value}
              step={sliderConfig.step}
              value={[currentValue]}
              onValueChange={handleSliderChange}
              className="cursor-pointer"
              trackClassName="bg-slate-700"
              rangeClassName="bg-gradient-to-r from-orange-500 to-red-500"
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
              Total:{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(currentValue)} {sliderConfig.value_label.toLowerCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Options */}
      {visibleProductOptions.length > 0 && (
        <div className="space-y-4 mb-6">
          <h4 className="font-semibold text-sm text-muted-foreground">Additional Options</h4>
          {visibleProductOptions.map((option) => {
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
                const rawButtonGroupOptions = option.options as any;
                const buttonGroupOptions = Array.isArray(rawButtonGroupOptions)
                  ? rawButtonGroupOptions
                  : rawButtonGroupOptions
                    ? [rawButtonGroupOptions]
                    : [];
                const isButtonNewFormat =
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
                  const avgLength =
                    labels.length > 0
                      ? labels.reduce((sum: number, l: string) => sum + String(l).length, 0) / labels.length
                      : 0;
                  
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
                        ? buttonGroupOptions.map((opt: any) => (
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
                        : buttonGroupOptions.map((opt: string) => (
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
              case "text":
                return (
                  <div key={option.id}>
                    <Label className="text-base font-semibold mb-2 block">
                      {option.label}
                      {option.is_required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Input
                      type={option.option_type}
                      value={selectedOptions[option.name] || ""}
                      onChange={(e) => handleOptionChange(option.name, e.target.value)}
                      min={option.min_value}
                      max={option.max_value}
                      required={option.is_required}
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
          
          {/* Slider Price Row - with context badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium">
                {sliderConfig.price_label || `${sliderConfig.value_label} Price`}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {currentValue} {sliderConfig.value_label.toLowerCase()}
              </span>
            </div>
            <span className="text-sm font-semibold text-foreground">{formatPrice(sliderPrice)}</span>
          </div>
          
          {/* Discount Row */}
          {activeDiscounts.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">Discount</span>
              <span className="text-sm font-semibold text-green-400">
                -{activeDiscounts.reduce((sum, d) => sum + (d.discount_percent || 0), 0)}%
              </span>
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

      {/* Action Buttons - Glassmorphism */}
      <div className="space-y-2">
        <Button 
          onClick={handleAddToCart} 
          className="w-full bg-primary/20 backdrop-blur-sm border border-primary/40 text-primary hover:bg-primary/30 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300" 
          size="lg"
          disabled={isAdding}
        >
          {isAdding ? (
            <>
              <svg className="w-5 h-5 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              Adding...
            </>
          ) : (
            <>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to Cart - {formatPrice(totalPrice)}
            </>
          )}
        </Button>
      </div>

      <ProductSupportSection productName={productName} />
    </div>
  );
};

export default SingleEndpointSliderConfigurator;
