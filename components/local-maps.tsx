"use client"

import { useState } from "react"
import { MapPin, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface LocalBusiness {
  name: string
  phone: string
  address: string
}

export function LocalMaps({ onSelectBusiness }: { onSelectBusiness: (phone: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([])

  const searchBusinesses = async () => {
    if (!searchQuery.trim()) return

    try {
      // Mock business search - replace with actual API
      const mockResults: LocalBusiness[] = [
        {
          name: `${searchQuery} Business 1`,
          phone: "+1-555-0101",
          address: "123 Main St, Colorado Springs, CO"
        },
        {
          name: `${searchQuery} Business 2`, 
          phone: "+1-555-0102",
          address: "456 Oak Ave, Colorado Springs, CO"
        }
      ]
      setBusinesses(mockResults)
      toast.success(`Found ${mockResults.length} businesses`)
    } catch (error) {
      console.error("Search error:", error)
      toast.error("Search failed")
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
         POI Explorer
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search businesses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchBusinesses()}
            className="text-sm"
          />
          <Button size="sm" onClick={searchBusinesses}>
            Search
          </Button>
        </div>

        <iframe 
          src="https://sudo-self.github.io/mapbox-terrian/"
          className="flex-1 rounded-lg border w-full"
          style={{ minHeight: '300px' }}
          title="Interactive Map"
        />

        {businesses.length > 0 && (
          <div className="border-t pt-3 flex-1 overflow-hidden flex flex-col">
            <p className="text-xs font-semibold mb-2 text-slate-700 dark:text-slate-300">Results ({businesses.length})</p>
            <div className="space-y-2 overflow-y-auto flex-1">
              {businesses.map((business, idx) => (
                <div key={idx} className="text-xs p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-blue-200 dark:border-slate-600 hover:shadow-md transition-shadow">
                  <p className="font-semibold text-slate-900 dark:text-white">{business.name}</p>
                  <p className="text-muted-foreground text-[11px] mt-1">{business.address}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 mt-2 gap-1 w-full text-xs"
                    onClick={() => {
                      onSelectBusiness(business.phone)
                      toast.success(`Added ${business.phone}`)
                    }}
                  >
                    <Phone className="h-3 w-3" />
                    {business.phone}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
