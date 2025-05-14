import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock } from "lucide-react";

interface CountdownTimerProps {
  targetDate: Date;
  title?: string;
  showLockStatus?: boolean;
}

export default function CountdownTimer({ 
  targetDate, 
  title = "Next Race Starts In", 
  showLockStatus = false 
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      // Calculate one day before the race
      const oneDayBeforeRace = new Date(targetDate);
      oneDayBeforeRace.setDate(oneDayBeforeRace.getDate() - 1);
      
      // Check if we're past the lock date (1 day before race)
      const isPastLockDate = now >= oneDayBeforeRace;
      setIsLocked(isPastLockDate);
      
      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        });
        return;
      }
      
      // If we're showing lock status, calculate time until lock
      // Otherwise calculate time until race
      const targetForCountdown = showLockStatus && !isPastLockDate 
        ? oneDayBeforeRace 
        : targetDate;
      
      const countdownDiff = targetForCountdown.getTime() - now.getTime();
      
      const days = Math.floor(countdownDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((countdownDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((countdownDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((countdownDiff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, [targetDate, showLockStatus]);

  return (
    <div className="mt-2 md:mt-0">
      {showLockStatus && (
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-medium">{title}</h3>
          {isLocked ? (
            <Badge variant="destructive" className="inline-flex items-center">
              <Lock className="h-3 w-3 mr-1" /> Team Locked
            </Badge>
          ) : (
            <Badge variant="outline" className="inline-flex items-center">
              <Unlock className="h-3 w-3 mr-1" /> Team Unlocked
            </Badge>
          )}
        </div>
      )}
      
      {!showLockStatus && (
        <h3 className="text-sm font-medium mb-2">{title}</h3>
      )}
      
      <div className="flex space-x-3 text-center">
        <div>
          <span className="block font-accent text-2xl font-bold">{timeLeft.days}</span>
          <span className="text-xs uppercase">Days</span>
        </div>
        <div>
          <span className="block font-accent text-2xl font-bold">{timeLeft.hours}</span>
          <span className="text-xs uppercase">Hours</span>
        </div>
        <div>
          <span className="block font-accent text-2xl font-bold">{timeLeft.minutes}</span>
          <span className="text-xs uppercase">Mins</span>
        </div>
        <div>
          <span className="block font-accent text-2xl font-bold">{timeLeft.seconds}</span>
          <span className="text-xs uppercase">Secs</span>
        </div>
      </div>
      
      {showLockStatus && isLocked && (
        <p className="text-xs text-muted-foreground mt-2">
          Your team is locked for the next race. You can still make up to 2 rider swaps.
        </p>
      )}
      {showLockStatus && !isLocked && (
        <p className="text-xs text-muted-foreground mt-2">
          Team locks 1 day before the race. Make your final team selections!
        </p>
      )}
    </div>
  );
}
