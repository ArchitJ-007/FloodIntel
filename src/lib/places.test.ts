/**
 * FloodIntel — Places & Geocoding Service Test Suite
 */

import {
  isCoordinatesInIndia,
  CURATED_INDIAN_LANDMARKS,
  searchCuratedLandmarks,
  searchPlacesIndia,
} from './places.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- Running FloodIntel Places & Geocoding Service Test Suite ---\n');

// 1. India Coordinate Bounding Box
console.log('1. Testing Coordinate Bounds for India:');
assert(isCoordinatesInIndia(19.0760, 72.8777), 'Mumbai is inside India bounds');
assert(isCoordinatesInIndia(28.6139, 77.2090), 'Delhi is inside India bounds');
assert(isCoordinatesInIndia(12.9716, 77.5946), 'Bengaluru is inside India bounds');
assert(isCoordinatesInIndia(13.0827, 80.2707), 'Chennai is inside India bounds');
assert(isCoordinatesInIndia(18.5204, 73.8567), 'Pune is inside India bounds');
assert(isCoordinatesInIndia(26.1445, 91.7362), 'Guwahati is inside India bounds');
assert(isCoordinatesInIndia(8.5241, 76.9366), 'Thiruvananthapuram is inside India bounds');

// Points outside India
assert(!isCoordinatesInIndia(51.5074, -0.1278), 'London is outside India');
assert(!isCoordinatesInIndia(40.7128, -74.0060), 'New York is outside India');
assert(!isCoordinatesInIndia(-33.8688, 151.2093), 'Sydney is outside India');
assert(!isCoordinatesInIndia(35.6762, 139.6503), 'Tokyo is outside India');

// 2. Curated Landmark Search
console.log('\n2. Testing Curated Landmark Instant Search:');
const silkBoardMatch = searchCuratedLandmarks('Silk Board');
assert(silkBoardMatch.length > 0, 'Found Silk Board in curated list');
assert(silkBoardMatch[0].name.includes('Silk Board'), 'Silk Board name matches');
assert(silkBoardMatch[0].countryCode === 'IN', 'Silk Board country code is IN');

const dadarMatch = searchCuratedLandmarks('Hindmata');
assert(dadarMatch.length > 0, 'Found Hindmata Dadar in curated list');
assert(dadarMatch[0].lat === 19.0068 && dadarMatch[0].lng === 72.8427, 'Dadar coordinates accurate');

const mintoMatch = searchCuratedLandmarks('Minto Bridge');
assert(mintoMatch.length > 0, 'Found Minto Bridge Delhi in curated list');
assert(mintoMatch[0].state === 'Delhi', 'Minto Bridge state is Delhi');

const velacheryMatch = searchCuratedLandmarks('Velachery');
assert(velacheryMatch.length > 0, 'Found Velachery Chennai in curated list');

// 3. Search Empty or Short Queries
console.log('\n3. Testing Query Validation Handling:');
async function runAsyncTests() {
  const shortResult = await searchPlacesIndia('a');
  assert(shortResult.length === 0, 'Queries shorter than 2 chars return empty array safely');

  const blankResult = await searchPlacesIndia('   ');
  assert(blankResult.length === 0, 'Whitespace queries return empty array safely');

  // Test place search with curated hit
  const puneHit = await searchPlacesIndia('Swargate');
  assert(puneHit.length > 0, 'Resolved Swargate, Pune search');
  assert(puneHit[0].lat === 18.5018, 'Swargate coordinates accurate');

  console.log('\n✨ ALL PLACES & GEOCODING TESTS PASSED SUCCESSFULLY! ✨');
}

runAsyncTests().catch((err) => {
  console.error('Async test failure:', err);
  process.exit(1);
});
