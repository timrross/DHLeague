import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { RotateCcw, AlertCircle } from 'lucide-react';

interface JokerCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function JokerCardDialog({ 
  open, 
  onOpenChange, 
  onConfirm
}: JokerCardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <RotateCcw className="h-5 w-5 mr-2 text-amber-500" />
            Use Joker Card
          </DialogTitle>
          <DialogDescription>
            The joker card allows you to reset your team once per season.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm flex">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Important:</p>
              <ul className="list-disc pl-5 mt-1 text-amber-700 space-y-1">
                <li>Your current team will be completely deleted</li>
                <li>You'll rebuild your team after the reset</li>
                <li>You can only use the joker card once per season</li>
                <li>Your new team must still follow all rules</li>
              </ul>
            </div>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:space-x-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="mb-2 sm:mb-0"
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
          >
            Confirm Joker Card Use
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
