import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCurrency } from "@/contexts/CurrencyContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, CheckCircle } from "lucide-react";

interface OrderDetailsDialogProps {
  order: {
    id: string;
    order_number: string;
    customer_email: string;
    customer_name: string | null;
    contact_details: string | null;
    country: string | null;
    address: string | null;
    notes: string | null;
    total_amount: number;
    cashback_used: number;
    cashback_earned: number;
    status: string;
    created_at: string;
    updated_at: string;
    order_items?: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      selected_options: any;
    }>;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (orderId: string, status: string) => void;
  onDelete: () => void;
}

export const OrderDetailsDialog = ({
  order,
  open,
  onOpenChange,
  onStatusUpdate,
  onDelete,
}: OrderDetailsDialogProps) => {
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!order) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "processing":
        return "bg-blue-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order deleted successfully",
      });

      setShowDeleteDialog(false);
      onOpenChange(false);
      onDelete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkCompleted = () => {
    onStatusUpdate(order.id, "completed");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Order Details - {order.order_number}</span>
              <Badge className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Customer Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{order.customer_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{order.customer_email}</p>
                </div>
                {order.contact_details && (
                  <div>
                    <p className="text-muted-foreground">Contact Details</p>
                    <p className="font-medium">{order.contact_details}</p>
                  </div>
                )}
                {order.country && (
                  <div>
                    <p className="text-muted-foreground">Country</p>
                    <p className="font-medium">{order.country}</p>
                  </div>
                )}
                {order.address && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium">{order.address}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Order Information */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Order Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Created At</p>
                  <p className="font-medium">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated At</p>
                  <p className="font-medium">
                    {new Date(order.updated_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="font-medium text-lg">{formatPrice(order.total_amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cashback</p>
                  <p className="font-medium">
                    Used: {formatPrice(order.cashback_used)} | Earned: {formatPrice(order.cashback_earned)}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Order Items */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Order Items</h3>
              <div className="space-y-3">
                {order.order_items?.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatPrice(item.unit_price * item.quantity)}
                      </p>
                    </div>
                    {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                      <div className="text-sm">
                        <p className="text-muted-foreground mb-1">Selected Options:</p>
                        <div className="space-y-1">
                          {Object.entries(item.selected_options).map(([key, value]) => (
                            <p key={key} className="text-xs">
                              <span className="font-medium">{key}:</span> {String(value)}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {order.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-lg mb-3">Customer Notes</h3>
                  <p className="text-sm bg-muted p-3 rounded-lg">{order.notes}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              {order.status === "processing" && (
                <Button
                  onClick={handleMarkCompleted}
                  className="gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark as Completed
                </Button>
              )}
              {order.status === "cancelled" && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Order
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order <strong>{order.order_number}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
