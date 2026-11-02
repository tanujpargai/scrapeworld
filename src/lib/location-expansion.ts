// src/lib/location-expansion.ts

export const AUTO_EXPANSION_MAP: Record<string, string[]> = {
  'Delhi': [
    'Delhi',
    'Noida',
    'Ghaziabad',
    'Gurgaon',
    'Faridabad',
    'Greater Noida',
    'Sonipat',
    'Bahadurgarh'
  ],
  'Mumbai': [
    'Mumbai',
    'Navi Mumbai',
    'Thane',
    'Kalyan',
    'Vasai',
    'Virar',
    'Mira Bhayandar'
  ],
  'Bangalore': [
    'Bangalore',
    'Bengaluru',
    'Mysore',
    'Tumkur',
    'Hosur',
    'Kolar'
  ],
  // Add fallback for anything else to just return the location itself
};

/**
 * Returns an array of locations to search through based on the provided seeds.
 * If manual expansion is used, it just returns the provided seeds.
 * If auto expansion is triggered (Mode B), it looks up the seed in the map
 * and appends the surrounding areas to the list to expand until target is met.
 */
export function getExpandedLocations(
  providedLocations: string[],
  autoExpand: boolean = false
): string[] {
  if (!autoExpand) {
    return providedLocations; // Mode A: Manual Expansion
  }

  // Mode B: Auto Expansion
  const expandedList: string[] = [];
  const added = new Set<string>();

  for (const loc of providedLocations) {
    // Attempt to match the base location to our map (case insensitive)
    const normalizedLoc = Object.keys(AUTO_EXPANSION_MAP).find(
      key => key.toLowerCase() === loc.toLowerCase()
    );

    if (normalizedLoc) {
      const expansion = AUTO_EXPANSION_MAP[normalizedLoc];
      for (const e of expansion) {
        if (!added.has(e.toLowerCase())) {
          expandedList.push(e);
          added.add(e.toLowerCase());
        }
      }
    } else {
      // If we don't have an expansion map for it, just add it.
      if (!added.has(loc.toLowerCase())) {
        expandedList.push(loc);
        added.add(loc.toLowerCase());
      }
    }
  }

  return expandedList;
}
