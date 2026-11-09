import type { Craft } from "@/lib/pipeline"

export const PHOTOGRAPHER_KIT = [
  "Body A and body B",
  "35mm",
  "50mm",
  "85mm",
  "Batteries charged",
  "Cards formatted",
  "Speedlight and trigger",
  "Reflector",
  "Tripod",
  "Tether cable",
  "Gray card",
  "Rain cover",
]

export const CINEMATOGRAPHER_KIT = [
  "Camera body",
  "24mm",
  "35mm",
  "50mm",
  "ND set",
  "Batteries and charger",
  "Media formatted",
  "Monitor",
  "Tripod and head",
  "Key light",
  "Bounce",
  "Two lavs and a recorder",
  "Shotgun and boom",
  "Slate",
  "Gaff tape",
  "Rain cover",
]

export const KITS: {
  id: string
  slug: string
  name: string
  craft: Extract<Craft, "photographer" | "cinematographer">
  items: string[]
}[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    slug: "photographer-still",
    name: "Photographer still kit",
    craft: "photographer",
    items: PHOTOGRAPHER_KIT,
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    slug: "cinematographer-set",
    name: "Cinematographer set kit",
    craft: "cinematographer",
    items: CINEMATOGRAPHER_KIT,
  },
]
