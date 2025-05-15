import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JokerCardButtonProps {
  jokerCardUsed: boolean;
  onClick: () => void;
  className?: string;
  variant?: 'default' | 'slim';
}

export default function JokerCardButton({ 
  jokerCardUsed, 
  onClick, 
  className,
  variant = 'default'
}: JokerCardButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant={jokerCardUsed ? "outline" : "default"}
      className={cn(
        "w-full",
        jokerCardUsed 
          ? 'text-gray-500 border-gray-300' 
          : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600',
        variant === 'slim' && 'py-1 h-8 text-xs',
        className
      )}
      disabled={jokerCardUsed}
    >
      <RotateCcw className={`${variant === 'default' ? 'w-4 h-4 mr-2' : 'w-3 h-3 mr-1'}`} />
      {jokerCardUsed ? 
        (variant === 'default' ? "JOKER CARD USED" : "Used") : 
        (variant === 'default' ? "USE JOKER CARD" : "Use Joker Card")
      }
    </Button>
  );
}