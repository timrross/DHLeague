import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

export default function FeaturedSections() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
      {/* Team Building Card */}
      <Card className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="h-48 bg-secondary overflow-hidden">
          <img
            src="https://mbaction.com/wp-content/uploads/2020/02/Finals-VDS-2019-1555.jpg"
            alt="Downhill mountain bike rider in action"
            className="w-full h-full object-cover transition duration-300 hover:scale-105"
          />
        </div>
        <CardContent className="p-5">
          <h3 className="font-heading font-bold text-xl text-secondary mb-2">
            BUILD YOUR TEAM
          </h3>
          <p className="text-gray-600 mb-4">
            Select 6 riders (min. 2 women) within your $2M budget to score
            points throughout the season.
          </p>
          <Link href="/team-builder">
            <div className="inline-block bg-primary hover:bg-red-700 text-white font-heading font-bold px-4 py-2 rounded-md transition duration-200 cursor-pointer">
              CREATE TEAM
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Race Schedule Card */}
      <Card className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="h-48 bg-secondary overflow-hidden">
          <img
            src="https://i.ytimg.com/vi/Co2qCO-cIPA/maxresdefault.jpg"
            alt="Downhill race course"
            className="w-full h-full object-cover transition duration-300 hover:scale-105"
          />
        </div>
        <CardContent className="p-5">
          <h3 className="font-heading font-bold text-xl text-secondary mb-2">
            RACE SCHEDULE
          </h3>
          <p className="text-gray-600 mb-4">
            Stay updated with all the rounds of the 2023 UCI Downhill World Cup
            season.
          </p>
          <Link href="/races">
            <div className="inline-block bg-primary hover:bg-red-700 text-white font-heading font-bold px-4 py-2 rounded-md transition duration-200 cursor-pointer">
              VIEW SCHEDULE
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Leaderboard Card */}
      <Card className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="h-48 bg-secondary overflow-hidden">
          <img
            src="https://p.vitalmtb.com/photos/press_releases/4747/title_image/s1600_sixteen_by_nine_196678.jpg"
            alt="Racing podium celebration"
            className="w-full h-full object-cover transition duration-300 hover:scale-105"
          />
        </div>
        <CardContent className="p-5">
          <h3 className="font-heading font-bold text-xl text-secondary mb-2">
            LEADERBOARDS
          </h3>
          <p className="text-gray-600 mb-4">
            See how your fantasy team ranks against others in global and private
            leagues.
          </p>
          <Link href="/leaderboard">
            <div className="inline-block bg-primary hover:bg-red-700 text-white font-heading font-bold px-4 py-2 rounded-md transition duration-200 cursor-pointer">
              VIEW STANDINGS
            </div>
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
