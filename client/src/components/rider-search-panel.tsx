import { useState } from "react";
import { Rider } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, RefreshCw } from "lucide-react";
import RiderCard from "@/components/rider-card";

interface RiderSearchPanelProps {
  riders: Rider[] | undefined;
  isLoading: boolean;
  selectedRiders: Rider[];
  onRiderSelect: (rider: Rider) => void;
  swapMode?: boolean;
}

export default function RiderSearchPanel({
  riders,
  isLoading,
  selectedRiders,
  onRiderSelect,
  swapMode = false
}: RiderSearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");

  // Filter riders based on search and tab
  const filteredRiders = riders ? (riders as Rider[]).filter((rider: Rider) => {
    const matchesSearch = rider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rider.team.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = selectedTab === "all" || rider.gender === selectedTab;
    return matchesSearch && matchesTab;
  }) : [];

  return (
    <div>
      <h3 className="font-heading font-bold text-xl text-secondary mb-4">SELECT RIDERS</h3>
      
      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search riders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Tabs for filtering */}
      <Tabs defaultValue="all" className="mb-4" onValueChange={setSelectedTab}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
          <TabsTrigger value="male" className="flex-1">Men</TabsTrigger>
          <TabsTrigger value="female" className="flex-1">Women</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Riders list */}
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2">Loading riders...</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          {filteredRiders.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No riders found</p>
            </div>
          ) : (
            filteredRiders.map((rider: Rider) => (
              <RiderCard
                key={rider.id}
                rider={rider}
                selected={selectedRiders.some(r => r.id === rider.id)}
                onClick={() => onRiderSelect(rider)}
                disabled={swapMode && selectedRiders.some(r => r.id === rider.id)}
                showSelectIcon
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}