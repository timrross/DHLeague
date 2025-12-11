import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import CountdownTimer from "@/components/countdown-timer";
import FeaturedSections from "@/components/featured-sections";
import TopRiders from "@/components/top-riders";
import { LeaderboardAd } from "@/components/ui/google-ad";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Race, Rider } from "@shared/schema";

export default function Home() {
  const { data: races, isLoading: racesLoading, isError: racesError, error: racesErrorDetail } = useQuery<Race[]>({
    queryKey: ['/api/races'],
  });

  const { data: riders, isLoading: ridersLoading, isError: ridersError, error: ridersErrorDetail } = useQuery<Rider[]>({
    queryKey: ['/api/riders'],
  });

  // Find the next race
  const nextRace = races?.find((race) => race.status === 'next');

  return (
    <div className="min-h-screen bg-neutral">
      {/* Hero Section */}
      <section className="relative bg-secondary" style={{ backgroundImage: "url('https://images.ctfassets.net/761l7gh5x5an/6imXFOweEx2vvfLsWdjaAC/df5f9d1fcade37a98121bc89d846c369/UCI_WCh-DHI_65.JPG?fit=thumb&fl=progressive&w=2400&h=')", backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white mb-4">
              UCI DOWNHILL FANTASY LEAGUE
            </h1>
            <p className="text-lg md:text-xl text-white mb-8">
              Build your dream team of elite downhill mountain bikers and compete against other fans for glory.
            </p>
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <Link href="/team-builder">
                <div className="bg-primary hover:bg-red-700 text-white font-bold py-3 px-8 rounded-md text-center transition duration-200 text-lg font-heading cursor-pointer">
                  CREATE YOUR TEAM
                </div>
              </Link>
              <Link href="/rules">
                <div className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold py-3 px-8 rounded-md text-center backdrop-filter backdrop-blur-sm transition duration-200 text-lg font-body cursor-pointer">
                  HOW IT WORKS
                </div>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-neutral to-transparent"></div>
      </section>

      {/* Next Race Countdown */}
      {racesLoading && (
        <section className="bg-primary text-white py-4">
          <div className="container mx-auto px-4">
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </section>
      )}

      {racesError && (
        <section className="bg-primary text-white py-4">
          <div className="container mx-auto px-4">
            <Alert variant="destructive" className="bg-white text-secondary">
              <AlertTitle>Unable to load next race</AlertTitle>
              <AlertDescription className="text-sm text-secondary/80">
                {racesErrorDetail instanceof Error ? racesErrorDetail.message : "An unexpected error occurred while fetching the next race."}
              </AlertDescription>
            </Alert>
          </div>
        </section>
      )}

      {!racesLoading && !racesError && nextRace && (
        <section className="bg-primary text-white py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div>
                <h3 className="font-heading font-bold text-lg md:text-xl">NEXT RACE:</h3>
                <p className="font-accent font-semibold">
                  {nextRace.name.toUpperCase()}, {nextRace.country.toUpperCase()} - {new Date(nextRace.startDate).toLocaleDateString()} to {new Date(nextRace.endDate).toLocaleDateString()}
                </p>
              </div>
              <CountdownTimer targetDate={new Date(nextRace.startDate)} />
              <Link href={`/races/${nextRace.id}`}>
                <div className="mt-3 md:mt-0 text-white underline font-semibold hover:text-white/80 transition cursor-pointer">
                  View Race Details
                </div>
              </Link>
            </div>
          </div>
        </section>
      )}

      {!racesLoading && !racesError && !nextRace && (
        <section className="bg-primary text-white py-4">
          <div className="container mx-auto px-4">
            <p className="font-body font-semibold">No upcoming race found. Check back soon!</p>
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Featured Sections */}
        <FeaturedSections />
        
        {/* Advertisement */}
        <div className="my-8">
          <LeaderboardAd client="ca-pub-0373252830777091" />
        </div>

        {/* Top Performers */}
        {ridersLoading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {ridersError && (
          <Alert variant="destructive" className="my-4">
            <AlertTitle>Unable to load top riders</AlertTitle>
            <AlertDescription>
              {ridersErrorDetail instanceof Error ? ridersErrorDetail.message : "An unexpected error occurred while fetching riders."}
            </AlertDescription>
          </Alert>
        )}

        {!ridersLoading && !ridersError && riders && (
          <TopRiders riders={riders as Rider[]} />
        )}
      </div>
    </div>
  );
}
