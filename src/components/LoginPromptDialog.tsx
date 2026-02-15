import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface LoginPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnUrl?: string;
}

export function LoginPromptDialog({ open, onOpenChange, returnUrl }: LoginPromptDialogProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    const url = returnUrl ? `/auth?returnUrl=${encodeURIComponent(returnUrl)}&tab=signin` : '/auth';
    navigate(url);
  };

  const handleSignup = () => {
    const url = returnUrl ? `/auth?returnUrl=${encodeURIComponent(returnUrl)}&tab=signup` : '/auth';
    navigate(url);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Account Required</AlertDialogTitle>
          <AlertDialogDescription>
            You need to be logged in to add items to your cart. Please sign in to your account or create a new one to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="bg-card/60 backdrop-blur-sm border-border/40 hover:bg-primary/10 hover:border-primary/40">Cancel</AlertDialogCancel>
          <Button onClick={handleLogin} variant="outline">
            Sign In
          </Button>
          <Button onClick={handleSignup} variant="solid">
            Create Account
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
