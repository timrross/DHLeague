import React from 'react';
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
import ResultManagement from '@/components/admin/ResultManagement';
import DatarideScraper from '@/components/admin/DatarideScraper';

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  
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
      
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="races">Races</TabsTrigger>
          <TabsTrigger value="riders">Riders</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="scraper">Scraper</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-6">
          <UserManagement currentUser={user} />
        </TabsContent>
        
        <TabsContent value="import" className="space-y-6">
          <ImportData />
        </TabsContent>
        
        <TabsContent value="races" className="space-y-6">
          <RaceManagement />
        </TabsContent>
        
        <TabsContent value="riders" className="space-y-6">
          <RiderManagement />
        </TabsContent>
        
        <TabsContent value="results" className="space-y-6">
          <ResultManagement />
        </TabsContent>

        <TabsContent value="scraper" className="space-y-6">
          <DatarideScraper />
        </TabsContent>
      </Tabs>
    </div>
  );
}