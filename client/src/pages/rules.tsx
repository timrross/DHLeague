import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

const pointsTable = [
  { position: "1st", points: "200" },
  { position: "2nd", points: "160" },
  { position: "3rd", points: "140" },
  { position: "4th", points: "120" },
  { position: "5th", points: "110" },
  { position: "6th", points: "100" },
  { position: "7th", points: "90" },
  { position: "8th", points: "80" },
  { position: "9th", points: "70" },
  { position: "10th", points: "60" },
  { position: "11th", points: "55" },
  { position: "12th", points: "50" },
  { position: "13th", points: "45" },
  { position: "14th", points: "40" },
  { position: "15th", points: "35" },
  { position: "16th", points: "30" },
  { position: "17th", points: "25" },
  { position: "18th", points: "20" },
  { position: "19th", points: "15" },
  { position: "20th", points: "10" },
  { position: "21st+", points: "0" },
];

const priceChangeTable = [
  { position: "1st", change: "+10%" },
  { position: "2nd", change: "+9%" },
  { position: "3rd", change: "+8%" },
  { position: "4th", change: "+7%" },
  { position: "5th", change: "+6%" },
  { position: "6th", change: "+5%" },
  { position: "7th", change: "+4%" },
  { position: "8th", change: "+3%" },
  { position: "9th", change: "+2%" },
  { position: "10th", change: "+1%" },
];

export default function Rules() {
  return (
    <div className="min-h-screen bg-neutral">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h2 className="mb-3 text-2xl font-heading font-bold text-secondary md:text-3xl">
          MTB Fantasy - How the Game Works
        </h2>
        <p className="mb-6 text-gray-700">
          Welcome to MTB Fantasy, a fantasy Downhill MTB league where you build a team of riders and
          score points based on real race results. This page explains how the game works, how
          scoring is calculated, and how transfers, substitutions, and budgets behave.
        </p>

        <Card className="overflow-hidden rounded-lg bg-white shadow-md">
          <CardContent className="p-6 md:p-8">
            <div className="space-y-10">
              <section>
                <h3 className="mb-4 text-xl font-heading text-secondary">1. The Basics</h3>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>MTB Fantasy currently covers Downhill (DHI) racing only.</li>
                  <li>Each race weekend is called a Round.</li>
                  <li>Each round has separate races for Elite Men and Elite Women.</li>
                  <li>Junior Men and Women will be added later.</li>
                </ul>
                <p className="mt-3 text-gray-700">
                  Your score comes from how your chosen riders perform in these races.
                </p>
              </section>

              <section>
                <h3 className="mb-4 text-xl font-heading text-secondary">2. Your Team</h3>
                <h4 className="mb-2 text-lg font-heading text-primary">Elite Team (mandatory)</h4>
                <p className="mb-3 text-gray-700">Every player must build an Elite Team.</p>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>6 starting riders</li>
                  <li>4 men</li>
                  <li>2 women</li>
                  <li>Optional bench rider (male or female)</li>
                </ul>
                <p className="mt-3 text-gray-700">
                  You cannot save a team unless it has exactly 6 starters with the correct gender
                  split. The bench is optional.
                </p>
              </section>

              <section>
                <h3 className="mb-4 text-xl font-heading text-secondary">3. Budget</h3>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>Elite Team budget: 2,000,000</li>
                  <li>Your budget includes all selected riders, including the bench if you choose one.</li>
                  <li>You cannot save a team that exceeds the budget.</li>
                </ul>
                <h4 className="mb-2 mt-4 text-lg font-heading text-primary">
                  Important: Rider value changes
                </h4>
                <p className="text-gray-700">
                  Rider prices change over the season based on performance (see section 9). If one
                  of your riders increases in value, your team may temporarily appear over budget.
                  This is allowed, but you cannot cash out the extra value to exceed the budget later.
                </p>
              </section>

              <section>
                <h3 className="mb-4 text-xl font-heading text-secondary">4. Rounds and Locking</h3>
                <h4 className="mb-2 text-lg font-heading text-primary">Before the season starts</h4>
                <p className="text-gray-700">You can make unlimited changes to your team.</p>
                <h4 className="mb-2 mt-4 text-lg font-heading text-primary">Before each round</h4>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>Team selection locks 48 hours before the race weekend begins.</li>
                  <li>Once locked, you cannot make changes for that round.</li>
                </ul>
                <p className="mt-3 text-gray-700">
                  If you do not save a team before lock, you score 0 points for that round.
                </p>
              </section>

              <section>
                <h3 className="mb-4 text-xl font-heading text-secondary">5. Transfers (Team Changes)</h3>
                <h4 className="mb-2 text-lg font-heading text-primary">After a round finishes</h4>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>Your team unlocks.</li>
                  <li>From Round 2 onwards, you can make up to 2 transfers per round.</li>
                </ul>
                <h4 className="mb-2 mt-4 text-lg font-heading text-primary">A transfer means</h4>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>Removing a rider (starter or bench).</li>
                  <li>Replacing them with a different rider.</li>
                  <li>Clicking Save.</li>
                </ul>
                <p className="mt-3 text-gray-700">Bench changes count as transfers.</p>
                <h4 className="mb-2 mt-4 text-lg font-heading text-primary">Undoing changes</h4>
                <p className="text-gray-700">
                  If you remove a rider and later re-add the same rider before saving, that does not
                  count as a transfer.
                </p>
              </section>

              <section>
                <h3 className="mb-4 text-xl font-heading text-secondary">6. The Joker (Wildcard)</h3>
                <p className="mb-3 text-gray-700">Each player gets one Joker per season.</p>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>Your team is cleared.</li>
                  <li>You can make unlimited changes until the next lock.</li>
                  <li>After that round locks, normal transfer rules resume.</li>
                </ul>
                <p className="mt-3 text-gray-700">The Joker can only be played:</p>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>After a round has finished.</li>
                  <li>Before the next round locks.</li>
                </ul>
              </section>

              <section>
                <h3 className="mb-4 text-xl font-heading text-secondary">
                  7. Bench and Automatic Substitution
                </h3>
                <h4 className="mb-2 text-lg font-heading text-primary">What the bench does</h4>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>The bench rider is only used if needed.</li>
                  <li>The bench never adds extra points.</li>
                  <li>At most one substitution per round.</li>
                </ul>
                <h4 className="mb-2 mt-4 text-lg font-heading text-primary">
                  When does a substitution happen?
                </h4>
                <p className="text-gray-700">A bench rider replaces a starter only if that starter:</p>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>Did Not Start (DNS)</li>
                  <li>Did Not Finish (DNF)</li>
                  <li>Did Not Qualify (DNQ)</li>
                </ul>
                <p className="mt-3 text-gray-700">A bench does NOT replace:</p>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>Riders who finished the race.</li>
                  <li>Riders who were Disqualified (DSQ).</li>
                </ul>
                <h4 className="mb-2 mt-4 text-lg font-heading text-primary">Gender rule</h4>
                <p className="text-gray-700">
                  The bench rider must be the same gender as the replaced starter.
                </p>
                <h4 className="mb-2 mt-4 text-lg font-heading text-primary">If multiple starters failed</h4>
                <p className="text-gray-700">
                  If more than one eligible starter failed, the starter with the highest rider value is
                  replaced.
                </p>
              </section>

              <section>
                <h3 className="mb-4 text-xl font-heading text-secondary">8. Scoring</h3>
                <h4 className="mb-2 text-lg font-heading text-primary">Which results count?</h4>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>Final race results only.</li>
                  <li>Qualifying does not score points.</li>
                </ul>
                <h4 className="mb-2 mt-4 text-lg font-heading text-primary">Points table (Top 20)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-200 px-4 py-2 text-left">Finish</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pointsTable.map((row) => (
                        <tr key={row.position}>
                          <td className="border border-gray-200 px-4 py-2">{row.position}</td>
                          <td className="border border-gray-200 px-4 py-2">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h4 className="mb-2 mt-4 text-lg font-heading text-primary">Special cases</h4>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>DNS / DNF / DNQ = 0 points (eligible for substitution).</li>
                  <li>DSQ = 0 points (not eligible for substitution).</li>
                </ul>
              </section>

              <section>
                <h3 className="mb-4 text-xl font-heading text-secondary">9. Rider Price Changes</h3>
                <p className="text-gray-700">After each round, rider prices update:</p>
                <h4 className="mb-2 mt-4 text-lg font-heading text-primary">Price increases</h4>
                <p className="text-gray-700">If a rider finishes Top 10:</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-200 px-4 py-2 text-left">Position</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Price Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceChangeTable.map((row) => (
                        <tr key={row.position}>
                          <td className="border border-gray-200 px-4 py-2">{row.position}</td>
                          <td className="border border-gray-200 px-4 py-2">{row.change}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h4 className="mb-2 mt-4 text-lg font-heading text-primary">No change</h4>
                <p className="text-gray-700">11th place or worse: no price change.</p>
                <h4 className="mb-2 mt-4 text-lg font-heading text-primary">Price drops</h4>
                <p className="text-gray-700">DNS / DNF / DNQ / DSQ = -10%.</p>
                <p className="mt-3 text-gray-700">
                  All prices are rounded up to the nearest 1,000.
                </p>
              </section>

              <section>
                <h3 className="mb-4 text-xl font-heading text-secondary">10. Round and Season Scores</h3>
                <h4 className="mb-2 text-lg font-heading text-primary">Round score</h4>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>Points from Elite Men.</li>
                  <li>Plus points from Elite Women.</li>
                  <li>Plus bench substitution if triggered.</li>
                </ul>
                <h4 className="mb-2 mt-4 text-lg font-heading text-primary">Season total</h4>
                <p className="text-gray-700">
                  Your season score is the sum of all your round scores. Once a round is finished and
                  scored, that score is final and future team changes do not affect it.
                </p>
              </section>

              <section>
                <h3 className="mb-4 text-xl font-heading text-secondary">
                  11. Junior Teams (Coming Later)
                </h3>
                <p className="text-gray-700">
                  Junior teams will be introduced later behind a feature flag. When enabled, Junior
                  Men and Women races will score, Junior teams will follow the same rules, and
                  combined scores will include Elite and Junior. For now, all scoring is Elite only.
                </p>
              </section>

              <div className="text-center">
                <Link href="/team-builder">
                  <span className="inline-block cursor-pointer rounded-md bg-primary px-8 py-3 font-heading font-bold text-white transition duration-200 hover:bg-red-700">
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
