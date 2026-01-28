"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface LocalBusiness {
  name: string
  phone: string
  address: string
  lat: number
  lng: number
}

export function LocalMaps({ onSelectBusiness }: { onSelectBusiness: (phone: string) => void }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return

    const initMap = async () => {
      const { Map } = await google.maps.importLibrary("maps") as any
      
      const defaultLocation = { lat: 40.7128, lng: -74.006 } // NYC default
      
      const newMap = new Map(mapRef.current, {
        center: defaultLocation,
        zoom: 13,
        mapTypeControl: false,
      })

      setMap(newMap)

      // Get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }
            setUserLocation(pos)
            newMap.setCenter(pos)
            
            // Add marker for user location
            new google.maps.Marker({
              position: pos,
              map: newMap,
              title: "Your Location",
            })
          },
          () => {
            toast.error("Could not get your location")
          }
        )
      }
    }

    initMap()
  }, [])

  const searchBusinesses = async () => {
    if (!map || !searchQuery.trim()) return

    try {
      const { PlacesService } = await google.maps.importLibrary("places") as any
      const service = new PlacesService(map)

      const request = {
        query: searchQuery,
        location: userLocation || { lat: 40.7128, lng: -74.006 },
        radius: 5000,
      }

      service.textSearch(request, (results: any[], status: any) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const found: LocalBusiness[] = results.slice(0, 5).map((place: any) => ({
            name: place.name,
            phone: place.formatted_phone_number || "N/A",
            address: place.formatted_address || "",
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          }))
          setBusinesses(found)

          // Clear existing markers
          map.setCenter(results[0].geometry.location)
        }
      })
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
          Local Business Search
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

        <div ref={mapRef} className="flex-1 rounded-lg border" />

        {businesses.length > 0 && (
          <div className="border-t pt-2 max-h-[150px] overflow-y-auto">
            <p className="text-xs font-semibold mb-2">Results</p>
            <div className="space-y-1">
              {businesses.map((business, idx) => (
                <div key={idx} className="text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded border">
                  <p className="font-medium">{business.name}</p>
                  <p className="text-muted-foreground text-[10px]">{business.address}</p>
                  {business.phone !== "N/A" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 mt-1 gap-1"
                      onClick={() => {
                        onSelectBusiness(business.phone)
                        toast.success(`Added ${business.phone}`)
                      }}
                    >
                      <Phone className="h-3 w-3" />
                      {business.phone}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
