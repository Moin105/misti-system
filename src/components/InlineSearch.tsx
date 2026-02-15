import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearch } from "@/hooks/useSearch";
import { useDebounce } from "@/hooks/useDebounce";

export function InlineSearch({ onResultSelect }: { onResultSelect?: () => void }) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Debounce the search query (400ms for better UX)
  const debouncedQuery = useDebounce(query, 400);
  
  // Use cached search hook
  const { data: results = [], isLoading: loading } = useSearch(debouncedQuery);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show results when we have a debounced query
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [debouncedQuery]);

  const handleSelect = (result: typeof results[0]) => {
    navigate(`/game/${result.game_slug}/${result.category_slug}/${result.slug}`);
    setQuery("");
    setShowResults(false);
    onResultSelect?.();
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search services..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => debouncedQuery.length >= 2 && setShowResults(true)}
          className="pl-10 w-full"
        />
      </div>

      {showResults && (
        <div className="absolute top-full mt-2 w-full bg-popover border border-border rounded-md shadow-lg max-h-96 overflow-y-auto z-[60]">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="w-full px-4 py-3 hover:bg-accent text-left flex items-center gap-3 transition-colors"
                >
                  <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {result.game_name} • {result.category_name}
                    </div>
                  </div>
                  <div className="text-sm font-semibold flex-shrink-0">
                    ${result.base_price}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No services found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
