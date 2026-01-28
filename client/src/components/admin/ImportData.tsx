import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import DatarideScraper from './DatarideScraper';

export default function ImportData() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Import data mutation
  const importDataMutation = useMutation({
    mutationFn: async (dataType: string) => {
      return apiRequest(`/api/admin/import-${dataType}`, {
        method: 'POST'
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/riders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/races'] });
      
      toast({
        title: 'Success',
        description: `${variables} data imported successfully`,
      });
    },
    onError: (error: any, variables) => {
      toast({
        title: 'Error',
        description: `Failed to import ${variables} data: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });

  // Handle import data
  const handleImportData = (dataType: string) => {
    importDataMutation.mutate(dataType);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Data</CardTitle>
          <CardDescription>
            Import race data from the UCI API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-sm font-medium mb-2">UCI MTB Downhill Events</h3>
              <p className="text-sm text-gray-500 mb-4">
                Import the latest race calendar from the UCI Mountain Bike Downhill World Cup.
              </p>
              <Button
                onClick={() => handleImportData('races')}
                disabled={importDataMutation.isPending}
                className="w-full"
              >
                {importDataMutation.isPending && importDataMutation.variables === 'races' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing Races...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Import UCI Races
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DatarideScraper />
    </div>
  );
}
