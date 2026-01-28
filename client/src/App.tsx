import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import TeamBuilder from "@/pages/team-builder";
import MyTeam from "@/pages/my-team";
import Races from "@/pages/races";
import RaceDetail from "@/pages/race-detail";
import Leaderboard from "@/pages/leaderboard";
import UserTeam from "@/pages/user-team";
import Rules from "@/pages/rules";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import UsernameSetup from "@/pages/username-setup";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import AdProvider from "@/components/layout/ad-provider";
import AnalyticsProvider from "@/components/layout/analytics-provider";
import { useAuth } from "@/hooks/useAuth";

function App() {
  const { user, isAuthenticated } = useAuth();
  const needsUsername = isAuthenticated && user && !user.username;

  return (
    <TooltipProvider>
      <AnalyticsProvider>
        <AdProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">
              {needsUsername ? (
                <UsernameSetup />
              ) : (
                <Switch>
                  <Route path="/" component={Home} />
                  <Route path="/my-team" component={MyTeam} />
                  <Route path="/team-builder" component={TeamBuilder} />
                  <Route path="/races" component={Races} />
                  <Route path="/races/:id">
                    {(params) => <RaceDetail id={Number(params.id)} />}
                  </Route>
                  <Route path="/leaderboard" component={Leaderboard} />
                  <Route path="/users/:userId/team" component={UserTeam} />
                  <Route path="/rules" component={Rules} />
                  <Route path="/admin/:tab/:id" component={Admin} />
                  <Route path="/admin/:tab" component={Admin} />
                  <Route path="/admin" component={Admin} />
                  <Route path="/login" component={Login} />
                  <Route component={NotFound} />
                </Switch>
              )}
            </main>
            <Footer />
          </div>
          <Toaster />
        </AdProvider>
      </AnalyticsProvider>
    </TooltipProvider>
  );
}

export default App;
