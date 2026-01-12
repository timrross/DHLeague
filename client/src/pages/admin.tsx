import React from 'react';
import { useLocation } from "wouter";
import { useAuth } from '@/hooks/useAuth';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import UserManagement from '@/components/admin/UserManagement';
import ImportData from '@/components/admin/ImportData';
import RaceManagement from '@/components/admin/RaceManagement';
import RiderManagement from '@/components/admin/RiderManagement';
import RiderImages from '@/components/admin/RiderImages';
import GameMechanics from '@/components/admin/GameMechanics';

const ADMIN_TABS = [
  "users",
  "import",
  "races",
  "riders",
  "images",
  "game",
] as const;

type AdminTab = (typeof ADMIN_TABS)[number];

const getTabFromPath = (path: string): AdminTab => {
  const match = path.match(/^\/admin(?:\/([^/?#]+))?/);
  const tab = match?.[1];
  if (tab && ADMIN_TABS.includes(tab as AdminTab)) {
    return tab as AdminTab;
  }
  return "users";
};

const getRaceIdFromPath = (path: string): number | null => {
  const match = path.match(/^\/admin\/races\/(\d+)(?:[/?#]|$)/);
  if (!match) {
    return null;
  }
  const raceId = Number(match[1]);
  return Number.isNaN(raceId) ? null : raceId;
};

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const activeTab = getTabFromPath(location);
  const selectedRaceId = getRaceIdFromPath(location);
  
  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You do not have permission to access the admin area.
          </p>
          <a href="/" className="inline-block px-4 py-2 bg-primary text-white rounded-md">
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (ADMIN_TABS.includes(value as AdminTab)) {
            setLocation(`/admin/${value}`);
          }
        }}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="races">Races</TabsTrigger>
          <TabsTrigger value="riders">Riders</TabsTrigger>
          <TabsTrigger value="images">Rider Images</TabsTrigger>
          <TabsTrigger value="game">Game</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-6">
          <UserManagement currentUser={user} />
        </TabsContent>
        
        <TabsContent value="import" className="space-y-6">
          <ImportData />
        </TabsContent>
        
        <TabsContent value="races" className="space-y-6">
          <RaceManagement
            selectedRaceId={selectedRaceId}
            onSelectRace={(raceId) =>
              setLocation(raceId ? `/admin/races/${raceId}` : "/admin/races")
            }
          />
        </TabsContent>
        
        <TabsContent value="riders" className="space-y-6">
          <RiderManagement />
        </TabsContent>
        
        <TabsContent value="images" className="space-y-6">
          <RiderImages />
        </TabsContent>

        <TabsContent value="game" className="space-y-6">
          <GameMechanics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
