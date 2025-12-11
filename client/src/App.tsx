import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import TeamBuilder from "@/pages/team-builder";
import Races from "@/pages/races";
import RaceDetail from "@/pages/race-detail";
import Leaderboard from "@/pages/leaderboard";
import Rules from "@/pages/rules";
import Admin from "@/pages/admin";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import AdProvider from "@/components/layout/ad-provider";

function App() {
  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/team-builder" component={TeamBuilder} />
            <Route path="/races" component={Races} />
            <Route path="/races/:id">
              {(params) => <RaceDetail id={Number(params.id)} />}
            </Route>
            <Route path="/leaderboard" component={Leaderboard} />
            <Route path="/rules" component={Rules} />
            <Route path="/admin" component={Admin} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <Footer />
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
