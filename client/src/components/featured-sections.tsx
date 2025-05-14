import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

export default function FeaturedSections() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
      {/* Team Building Card */}
      <Card className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="h-48 bg-secondary overflow-hidden">
          <img 
            src="https://pixabay.com/get/g82d416b5bbc7820f8ea5af0c90bdf0829e8ad8f769a046921399f801203c7f8279dd2ab9c12a25bf7b72534d11000953079db6657a267d77c0d503cc805b703e_1280.jpg" 
            alt="Rider preparing for race" 
            className="w-full h-full object-cover transition duration-300 hover:scale-105"
          />
        </div>
        <CardContent className="p-5">
          <h3 className="font-heading font-bold text-xl text-secondary mb-2">BUILD YOUR TEAM</h3>
          <p className="text-gray-600 mb-4">Select 6 riders (min. 2 women) within your $2M budget to score points throughout the season.</p>
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
            src="https://pixabay.com/get/g751aa0d1ab1f9ca6d5508fdb09df26de0a85b3824bb4f9e9b77ad79275d045f226d7a01b000170bd1c6f1878663a0ef61fd89985a5c26c8412bc44582129ddb3_1280.jpg" 
            alt="Downhill race course" 
            className="w-full h-full object-cover transition duration-300 hover:scale-105"
          />
        </div>
        <CardContent className="p-5">
          <h3 className="font-heading font-bold text-xl text-secondary mb-2">RACE SCHEDULE</h3>
          <p className="text-gray-600 mb-4">Stay updated with all the rounds of the 2023 UCI Downhill World Cup season.</p>
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
            src="https://pixabay.com/get/g28e15b9f5a22aa30a41ea08213ef2fbedb8ee984b9d5d954537c3cddb581aaf079f84d82760049982bbdcb0fa6436e093130a781e5b53d611f8f227c207134bf_1280.jpg" 
            alt="Racing podium celebration" 
            className="w-full h-full object-cover transition duration-300 hover:scale-105"
          />
        </div>
        <CardContent className="p-5">
          <h3 className="font-heading font-bold text-xl text-secondary mb-2">LEADERBOARDS</h3>
          <p className="text-gray-600 mb-4">See how your fantasy team ranks against others in global and private leagues.</p>
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
