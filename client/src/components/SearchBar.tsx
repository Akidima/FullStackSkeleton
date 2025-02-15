import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Meeting } from "@shared/schema";

interface SearchBarProps {
  onSearchResults: (results: Meeting[]) => void;
  onSearching: (isSearching: boolean) => void;
}

export function SearchBar({ onSearchResults, onSearching }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      onSearching(true);
      const response = await apiRequest("POST", "/api/meetings/search", { query });
      const results = await response.json();
      onSearchResults(results);
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Failed to perform search. Please try again.",
        variant: "destructive",
      });
    } finally {
      onSearching(false);
    }
  };

  return (
    <div className="flex gap-2 mb-6">
      <Input
        placeholder="Search meetings and notes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
      />
      <Button onClick={handleSearch}>
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}
