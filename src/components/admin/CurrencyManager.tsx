import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface ExchangeRate {
  id: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  last_updated: string;
}

const CurrencyManager = () => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .order("target_currency");

      if (error) throw error;
      setRates(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualUpdate = async () => {
    setUpdating(true);
    try {
      console.log('Calling update-exchange-rates function...');
      
      const { data, error } = await supabase.functions.invoke('update-exchange-rates', {
        body: {}
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('Function response:', data);

      toast({
        title: "Success",
        description: "Exchange rates updated successfully",
      });
      
      await fetchRates();
    } catch (error: any) {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update exchange rates",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Currency Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Exchange rates update automatically every 24 hours at midnight UTC
          </p>
        </div>
        <Button onClick={handleManualUpdate} disabled={updating}>
          {updating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Update Now
            </>
          )}
        </Button>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Base Currency</TableHead>
              <TableHead>Target Currency</TableHead>
              <TableHead>Exchange Rate</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((rate) => (
              <TableRow key={rate.id}>
                <TableCell className="font-medium">{rate.base_currency}</TableCell>
                <TableCell>{rate.target_currency}</TableCell>
                <TableCell className="font-mono">
                  {Number(rate.rate).toFixed(6)}
                </TableCell>
                <TableCell>
                  {format(new Date(rate.last_updated), "PPp")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-2">Information</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Exchange rates are fetched from exchangerate-api.com</li>
          <li>• Automatic updates occur daily at midnight UTC</li>
          <li>• All prices in the store will be converted based on user selection</li>
          <li>• Supported currencies: USD (US Dollar) and EUR (Euro)</li>
        </ul>
      </Card>
    </div>
  );
};

export default CurrencyManager;
