import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: Date;
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="mt-2 md:mt-0">
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
    </div>
  );
}
