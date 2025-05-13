import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import TeamBuilder from "@/pages/team-builder";
import Races from "@/pages/races";
import Leaderboard from "@/pages/leaderboard";
import Rules from "@/pages/rules";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

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
            <Route path="/leaderboard" component={Leaderboard} />
            <Route path="/rules" component={Rules} />
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
