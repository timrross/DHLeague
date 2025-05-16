import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

export default function Rules() {
  return (
    <div className="min-h-screen bg-neutral">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h2 className="text-2xl md:text-3xl font-heading font-bold text-secondary mb-6">HOW IT WORKS</h2>
        
        <Card className="bg-white rounded-lg shadow-md overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="prose max-w-none">
              <h3 className="font-heading text-xl text-secondary mb-4">TEAM BUILDING RULES</h3>
              
              <div className="mb-8">
                <h4 className="font-heading text-lg text-primary mb-2">Budget Constraints</h4>
                <p className="text-gray-700 mb-4">
                  Each manager has a budget of <strong>$2,000,000</strong> to build their dream team. The rider costs are based on their performance from the previous season.
                </p>
                
                <h4 className="font-heading text-lg text-primary mb-2">Team Composition</h4>
                <ul className="list-disc pl-5 text-gray-700 mb-4">
                  <li>Your team must have <strong>exactly 6 riders</strong></li>
                  <li>You can have a <strong>maximum of 4 male riders</strong></li>
                  <li>You must have <strong>at least 2 female riders</strong></li>
                  <li>Your total team cost cannot exceed the $2M budget</li>
                </ul>
                
                <h4 className="font-heading text-lg text-primary mb-2">Team Management</h4>
                <p className="text-gray-700 mb-4">
                  You can make changes to your team at any time before a race weekend begins. Once racing starts for a round, teams are locked until that round is complete.
                </p>
              </div>
              
              <h3 className="font-heading text-xl text-secondary mb-4">SCORING SYSTEM</h3>
              
              <div className="mb-8">
                <h4 className="font-heading text-lg text-primary mb-2">Points Distribution</h4>
                <p className="text-gray-700 mb-2">Points are awarded to riders based on their finishing position in each race:</p>
                
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-200 px-4 py-2 text-left">Position</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-200 px-4 py-2">1st</td>
                        <td className="border border-gray-200 px-4 py-2">50</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 px-4 py-2">2nd</td>
                        <td className="border border-gray-200 px-4 py-2">45</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 px-4 py-2">3rd</td>
                        <td className="border border-gray-200 px-4 py-2">40</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 px-4 py-2">4th</td>
                        <td className="border border-gray-200 px-4 py-2">35</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 px-4 py-2">5th</td>
                        <td className="border border-gray-200 px-4 py-2">30</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 px-4 py-2">6th - 10th</td>
                        <td className="border border-gray-200 px-4 py-2">25 - 5 (decreasing by 5)</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 px-4 py-2">11th - 20th</td>
                        <td className="border border-gray-200 px-4 py-2">4 - 1 (decreasing by 1)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <h4 className="font-heading text-lg text-primary mb-2">Bonus Points</h4>
                <ul className="list-disc pl-5 text-gray-700 mb-4">
                  <li><strong>Fastest Qualifier:</strong> +5 points</li>
                  <li><strong>Fastest Split Time:</strong> +3 points per split</li>
                  <li><strong>Clean Sweep (Qualifying + Race Win):</strong> +10 points</li>
                </ul>
              </div>
              
              <h3 className="font-heading text-xl text-secondary mb-4">LEAGUES AND COMPETITIONS</h3>
              
              <div className="mb-8">
                <p className="text-gray-700 mb-4">
                  You can compete in the global leaderboard against all players, or create and join private leagues to compete with friends, family, or colleagues.
                </p>
                
                <h4 className="font-heading text-lg text-primary mb-2">Season Prizes</h4>
                <p className="text-gray-700 mb-4">
                  The global leaderboard winners will receive prizes at the end of the season:
                </p>
                <ul className="list-disc pl-5 text-gray-700">
                  <li><strong>1st Place:</strong> UCI World Cup VIP Experience</li>
                  <li><strong>2nd Place:</strong> Pro Rider Signed Jersey</li>
                  <li><strong>3rd Place:</strong> Limited Edition UCI World Cup Merchandise Pack</li>
                </ul>
              </div>

              <div className="text-center mt-8">
                <Link href="/team-builder">
                  <span className="inline-block bg-primary hover:bg-red-700 text-white font-heading font-bold px-8 py-3 rounded-md transition duration-200 cursor-pointer">
                    CREATE YOUR TEAM NOW
                  </span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
