// Plastic waste kg/capita/year per ward
// Tokyo average: ~47 kg/capita/yr (Ministry of Environment FY2023)
// Commercial/business wards skew higher due to office packaging + visitor density
export const WARD_WASTE: Record<string, number> = {
  Chiyoda: 67.2,     // Marunouchi CBD, massive daytime office population
  Chuo: 63.8,        // Ginza, Nihonbashi — dense retail and tourism
  Minato: 58.9,      // Roppongi, Shiodome, foreign consulates
  Taito: 59.3,       // Asakusa tourist corridor
  Shinjuku: 55.7,    // Kabukicho, Takashimaya Times Square, commuter nexus
  Shibuya: 52.4,     // Scramble crossing, youth consumption hub
  Toshima: 52.1,     // Ikebukuro second-largest station
  Adachi: 51.2,      // Dense residential outer ward
  Edogawa: 50.1,     // Outer residential
  Katsushika: 49.7,
  Sumida: 48.4,      // Asakusabashi, near Skytree
  Arakawa: 48.8,
  Shinagawa: 48.2,   // Major terminal + hotel district
  Nakano: 46.8,
  Kita: 47.1,
  Itabashi: 47.5,
  Meguro: 47.6,
  Bunkyo: 46.5,      // University area, moderate
  Suginami: 45.9,
  Ota: 46.3,         // Industrial + residential mix
  Koto: 44.8,        // Waterfront residential
  Setagaya: 44.6,    // Largest ward by population, residential
  Nerima: 44.2,      // Outer residential, lowest commercial density
}

// Rough population estimates per ward (people)
// Source: Tokyo Statistical Yearbook 2023
export const WARD_POPULATION: Record<string, number> = {
  Adachi: 690000,
  Arakawa: 215000,
  Bunkyo: 236000,
  Chiyoda: 67000,
  Chuo: 170000,
  Edogawa: 700000,
  Itabashi: 560000,
  Katsushika: 455000,
  Kita: 345000,
  Koto: 525000,
  Meguro: 283000,
  Minato: 262000,
  Nakano: 328000,
  Nerima: 750000,
  Ota: 740000,
  Setagaya: 940000,
  Shibuya: 240000,
  Shinagawa: 415000,
  Shinjuku: 347000,
  Suginami: 577000,
  Sumida: 274000,
  Taito: 204000,
  Toshima: 300000,
}
