// FIFA World Cup 2026 - Complete Match Data
// All times in UTC (BST = UTC+1 during summer, so subtract 1 hour from BST times)
// Source: FIFA / Sky Sports schedule

const GROUPS = {
    A: { name: "Grupo A", teams: ["Mexico", "South Africa", "South Korea", "Czechia"] },
    B: { name: "Grupo B", teams: ["Canada", "Bosnia & Herzegovina", "Qatar", "Switzerland"] },
    C: { name: "Grupo C", teams: ["Brazil", "Morocco", "Haiti", "Scotland"] },
    D: { name: "Grupo D", teams: ["USA", "Paraguay", "Australia", "Turkey"] },
    E: { name: "Grupo E", teams: ["Germany", "Curacao", "Ivory Coast", "Ecuador"] },
    F: { name: "Grupo F", teams: ["Netherlands", "Japan", "Sweden", "Tunisia"] },
    G: { name: "Grupo G", teams: ["Belgium", "Egypt", "Iran", "New Zealand"] },
    H: { name: "Grupo H", teams: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"] },
    I: { name: "Grupo I", teams: ["France", "Senegal", "Iraq", "Norway"] },
    J: { name: "Grupo J", teams: ["Argentina", "Algeria", "Austria", "Jordan"] },
    K: { name: "Grupo K", teams: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"] },
    L: { name: "Grupo L", teams: ["England", "Croatia", "Ghana", "Panama"] }
};

// Flag emoji mapping
const FLAGS = {
    "Mexico": "\ud83c\uddf2\ud83c\uddfd",
    "South Africa": "\ud83c\uddff\ud83c\udde6",
    "South Korea": "\ud83c\uddf0\ud83c\uddf7",
    "Czechia": "\ud83c\udde8\ud83c\uddff",
    "Canada": "\ud83c\udde8\ud83c\udde6",
    "Bosnia & Herzegovina": "\ud83c\udde7\ud83c\udde6",
    "Qatar": "\ud83c\uddf6\ud83c\udde6",
    "Switzerland": "\ud83c\udde8\ud83c\udded",
    "Brazil": "\ud83c\udde7\ud83c\uddf7",
    "Morocco": "\ud83c\uddf2\ud83c\udde6",
    "Haiti": "\ud83c\udded\ud83c\uddf9",
    "Scotland": "\ud83c\udff4\udb40\udc67\udb40\udc62\udb40\udc73\udb40\udc63\udb40\udc74\udb40\udc7f",
    "USA": "\ud83c\uddfa\ud83c\uddf8",
    "Paraguay": "\ud83c\uddf5\ud83c\uddfe",
    "Australia": "\ud83c\udde6\ud83c\uddfa",
    "Turkey": "\ud83c\uddf9\ud83c\uddf7",
    "Germany": "\ud83c\udde9\ud83c\uddea",
    "Curacao": "\ud83c\udde8\ud83c\uddfc",
    "Ivory Coast": "\ud83c\udde8\ud83c\uddee",
    "Ecuador": "\ud83c\uddea\ud83c\udde8",
    "Netherlands": "\ud83c\uddf3\ud83c\uddf1",
    "Japan": "\ud83c\uddef\ud83c\uddf5",
    "Sweden": "\ud83c\uddf8\ud83c\uddea",
    "Tunisia": "\ud83c\uddf9\ud83c\uddf3",
    "Belgium": "\ud83c\udde7\ud83c\uddea",
    "Egypt": "\ud83c\uddea\ud83c\uddec",
    "Iran": "\ud83c\uddee\ud83c\uddf7",
    "New Zealand": "\ud83c\uddf3\ud83c\uddff",
    "Spain": "\ud83c\uddea\ud83c\uddf8",
    "Cape Verde": "\ud83c\udde8\ud83c\uddfb",
    "Saudi Arabia": "\ud83c\uddf8\ud83c\udde6",
    "Uruguay": "\ud83c\uddfa\ud83c\uddfe",
    "France": "\ud83c\uddeb\ud83c\uddf7",
    "Senegal": "\ud83c\uddf8\ud83c\uddf3",
    "Iraq": "\ud83c\uddee\ud83c\uddf6",
    "Norway": "\ud83c\uddf3\ud83c\uddf4",
    "Argentina": "\ud83c\udde6\ud83c\uddf7",
    "Algeria": "\ud83c\udde9\ud83c\uddff",
    "Austria": "\ud83c\udde6\ud83c\uddf9",
    "Jordan": "\ud83c\uddef\ud83c\uddf4",
    "Portugal": "\ud83c\uddf5\ud83c\uddf9",
    "DR Congo": "\ud83c\udde8\ud83c\udde9",
    "Uzbekistan": "\ud83c\uddfa\ud83c\uddff",
    "Colombia": "\ud83c\udde8\ud83c\uddf4",
    "England": "\ud83c\udff4\udb40\udc67\udb40\udc62\udb40\udc65\udb40\udc6e\udb40\udc67\udb40\udc7f",
    "Croatia": "\ud83c\udded\ud83c\uddf7",
    "Ghana": "\ud83c\uddec\ud83c\udded",
    "Panama": "\ud83c\uddf5\ud83c\udde6",
    "TBD": "\ud83c\udff3\ufe0f"
};

// All 104 matches
// BST times from Sky Sports converted to UTC (BST - 1 = UTC)
const MATCHES = [
    // ===== GROUP A =====
    { id: 1, group: "A", stage: "groups", team1: "Mexico", team2: "South Africa", date: "2026-06-11T19:00:00Z", city: "Mexico City" },
    { id: 2, group: "A", stage: "groups", team1: "South Korea", team2: "Czechia", date: "2026-06-12T02:00:00Z", city: "Zapopan" },
    { id: 3, group: "A", stage: "groups", team1: "Czechia", team2: "South Africa", date: "2026-06-18T16:00:00Z", city: "Atlanta" },
    { id: 4, group: "A", stage: "groups", team1: "Mexico", team2: "South Korea", date: "2026-06-19T01:00:00Z", city: "Zapopan" },
    { id: 5, group: "A", stage: "groups", team1: "South Africa", team2: "South Korea", date: "2026-06-25T01:00:00Z", city: "Guadalupe" },
    { id: 6, group: "A", stage: "groups", team1: "Czechia", team2: "Mexico", date: "2026-06-25T01:00:00Z", city: "Mexico City" },

    // ===== GROUP B =====
    { id: 7, group: "B", stage: "groups", team1: "Canada", team2: "Bosnia & Herzegovina", date: "2026-06-12T19:00:00Z", city: "Toronto" },
    { id: 8, group: "B", stage: "groups", team1: "Qatar", team2: "Switzerland", date: "2026-06-13T19:00:00Z", city: "Santa Clara" },
    { id: 9, group: "B", stage: "groups", team1: "Switzerland", team2: "Bosnia & Herzegovina", date: "2026-06-18T19:00:00Z", city: "Los Angeles" },
    { id: 10, group: "B", stage: "groups", team1: "Canada", team2: "Qatar", date: "2026-06-18T22:00:00Z", city: "Vancouver" },
    { id: 11, group: "B", stage: "groups", team1: "Switzerland", team2: "Canada", date: "2026-06-24T19:00:00Z", city: "Vancouver" },
    { id: 12, group: "B", stage: "groups", team1: "Bosnia & Herzegovina", team2: "Qatar", date: "2026-06-24T19:00:00Z", city: "Seattle" },

    // ===== GROUP C =====
    { id: 13, group: "C", stage: "groups", team1: "Brazil", team2: "Morocco", date: "2026-06-13T22:00:00Z", city: "New Jersey" },
    { id: 14, group: "C", stage: "groups", team1: "Haiti", team2: "Scotland", date: "2026-06-14T01:00:00Z", city: "Foxborough" },
    { id: 15, group: "C", stage: "groups", team1: "Scotland", team2: "Morocco", date: "2026-06-19T22:00:00Z", city: "Foxborough" },
    { id: 16, group: "C", stage: "groups", team1: "Brazil", team2: "Haiti", date: "2026-06-20T01:00:00Z", city: "Philadelphia" },
    { id: 17, group: "C", stage: "groups", team1: "Morocco", team2: "Haiti", date: "2026-06-24T22:00:00Z", city: "Atlanta" },
    { id: 18, group: "C", stage: "groups", team1: "Scotland", team2: "Brazil", date: "2026-06-24T22:00:00Z", city: "Miami" },

    // ===== GROUP D =====
    { id: 19, group: "D", stage: "groups", team1: "USA", team2: "Paraguay", date: "2026-06-13T01:00:00Z", city: "Los Angeles" },
    { id: 20, group: "D", stage: "groups", team1: "Australia", team2: "Turkey", date: "2026-06-14T04:00:00Z", city: "Vancouver" },
    { id: 21, group: "D", stage: "groups", team1: "USA", team2: "Australia", date: "2026-06-19T19:00:00Z", city: "Seattle" },
    { id: 22, group: "D", stage: "groups", team1: "Turkey", team2: "Paraguay", date: "2026-06-20T04:00:00Z", city: "Santa Clara" },
    { id: 23, group: "D", stage: "groups", team1: "Turkey", team2: "USA", date: "2026-06-26T02:00:00Z", city: "Los Angeles" },
    { id: 24, group: "D", stage: "groups", team1: "Paraguay", team2: "Australia", date: "2026-06-26T02:00:00Z", city: "Santa Clara" },

    // ===== GROUP E =====
    { id: 25, group: "E", stage: "groups", team1: "Germany", team2: "Curacao", date: "2026-06-14T17:00:00Z", city: "Houston" },
    { id: 26, group: "E", stage: "groups", team1: "Ivory Coast", team2: "Ecuador", date: "2026-06-14T23:00:00Z", city: "Philadelphia" },
    { id: 27, group: "E", stage: "groups", team1: "Germany", team2: "Ivory Coast", date: "2026-06-20T20:00:00Z", city: "Toronto" },
    { id: 28, group: "E", stage: "groups", team1: "Ecuador", team2: "Curacao", date: "2026-06-21T00:00:00Z", city: "Kansas City" },
    { id: 29, group: "E", stage: "groups", team1: "Curacao", team2: "Ivory Coast", date: "2026-06-25T20:00:00Z", city: "Philadelphia" },
    { id: 30, group: "E", stage: "groups", team1: "Ecuador", team2: "Germany", date: "2026-06-25T20:00:00Z", city: "New Jersey" },

    // ===== GROUP F =====
    { id: 31, group: "F", stage: "groups", team1: "Netherlands", team2: "Japan", date: "2026-06-14T20:00:00Z", city: "Arlington" },
    { id: 32, group: "F", stage: "groups", team1: "Sweden", team2: "Tunisia", date: "2026-06-15T02:00:00Z", city: "Guadalupe" },
    { id: 33, group: "F", stage: "groups", team1: "Netherlands", team2: "Sweden", date: "2026-06-20T17:00:00Z", city: "Houston" },
    { id: 34, group: "F", stage: "groups", team1: "Tunisia", team2: "Japan", date: "2026-06-21T04:00:00Z", city: "Guadalupe" },
    { id: 35, group: "F", stage: "groups", team1: "Tunisia", team2: "Netherlands", date: "2026-06-25T23:00:00Z", city: "Kansas City" },
    { id: 36, group: "F", stage: "groups", team1: "Japan", team2: "Sweden", date: "2026-06-25T23:00:00Z", city: "Arlington" },

    // ===== GROUP G =====
    { id: 37, group: "G", stage: "groups", team1: "Belgium", team2: "Egypt", date: "2026-06-15T19:00:00Z", city: "Seattle" },
    { id: 38, group: "G", stage: "groups", team1: "Iran", team2: "New Zealand", date: "2026-06-16T01:00:00Z", city: "Los Angeles" },
    { id: 39, group: "G", stage: "groups", team1: "Belgium", team2: "Iran", date: "2026-06-21T19:00:00Z", city: "Los Angeles" },
    { id: 40, group: "G", stage: "groups", team1: "Egypt", team2: "New Zealand", date: "2026-06-21T22:00:00Z", city: "Miami" },
    { id: 41, group: "G", stage: "groups", team1: "New Zealand", team2: "Belgium", date: "2026-06-27T03:00:00Z", city: "Vancouver" },
    { id: 42, group: "G", stage: "groups", team1: "Egypt", team2: "Iran", date: "2026-06-27T03:00:00Z", city: "Seattle" },

    // ===== GROUP H =====
    { id: 43, group: "H", stage: "groups", team1: "Spain", team2: "Cape Verde", date: "2026-06-15T16:00:00Z", city: "Atlanta" },
    { id: 44, group: "H", stage: "groups", team1: "Saudi Arabia", team2: "Uruguay", date: "2026-06-15T22:00:00Z", city: "Miami" },
    { id: 45, group: "H", stage: "groups", team1: "Spain", team2: "Saudi Arabia", date: "2026-06-21T16:00:00Z", city: "Atlanta" },
    { id: 46, group: "H", stage: "groups", team1: "Uruguay", team2: "Cape Verde", date: "2026-06-21T22:00:00Z", city: "Miami" },
    { id: 47, group: "H", stage: "groups", team1: "Cape Verde", team2: "Saudi Arabia", date: "2026-06-27T00:00:00Z", city: "Houston" },
    { id: 48, group: "H", stage: "groups", team1: "Uruguay", team2: "Spain", date: "2026-06-27T00:00:00Z", city: "Zapopan" },

    // ===== GROUP I =====
    { id: 49, group: "I", stage: "groups", team1: "France", team2: "Senegal", date: "2026-06-16T19:00:00Z", city: "New Jersey" },
    { id: 50, group: "I", stage: "groups", team1: "Iraq", team2: "Norway", date: "2026-06-16T22:00:00Z", city: "Foxborough" },
    { id: 51, group: "I", stage: "groups", team1: "France", team2: "Iraq", date: "2026-06-22T21:00:00Z", city: "Philadelphia" },
    { id: 52, group: "I", stage: "groups", team1: "Norway", team2: "Senegal", date: "2026-06-23T00:00:00Z", city: "Toronto" },
    { id: 53, group: "I", stage: "groups", team1: "Norway", team2: "France", date: "2026-06-26T19:00:00Z", city: "Foxborough" },
    { id: 54, group: "I", stage: "groups", team1: "Senegal", team2: "Iraq", date: "2026-06-26T19:00:00Z", city: "Toronto" },

    // ===== GROUP J =====
    { id: 55, group: "J", stage: "groups", team1: "Argentina", team2: "Algeria", date: "2026-06-17T01:00:00Z", city: "Kansas City" },
    { id: 56, group: "J", stage: "groups", team1: "Austria", team2: "Jordan", date: "2026-06-17T04:00:00Z", city: "Santa Clara" },
    { id: 57, group: "J", stage: "groups", team1: "Argentina", team2: "Austria", date: "2026-06-22T17:00:00Z", city: "Arlington" },
    { id: 58, group: "J", stage: "groups", team1: "Jordan", team2: "Algeria", date: "2026-06-23T03:00:00Z", city: "Santa Clara" },
    { id: 59, group: "J", stage: "groups", team1: "Algeria", team2: "Austria", date: "2026-06-28T02:00:00Z", city: "Kansas City" },
    { id: 60, group: "J", stage: "groups", team1: "Jordan", team2: "Argentina", date: "2026-06-28T02:00:00Z", city: "Arlington" },

    // ===== GROUP K =====
    { id: 61, group: "K", stage: "groups", team1: "Portugal", team2: "DR Congo", date: "2026-06-17T17:00:00Z", city: "Houston" },
    { id: 62, group: "K", stage: "groups", team1: "Uzbekistan", team2: "Colombia", date: "2026-06-18T02:00:00Z", city: "Mexico City" },
    { id: 63, group: "K", stage: "groups", team1: "Portugal", team2: "Uzbekistan", date: "2026-06-23T17:00:00Z", city: "Houston" },
    { id: 64, group: "K", stage: "groups", team1: "Colombia", team2: "DR Congo", date: "2026-06-24T02:00:00Z", city: "Zapopan" },
    { id: 65, group: "K", stage: "groups", team1: "Colombia", team2: "Portugal", date: "2026-06-27T23:30:00Z", city: "Miami" },
    { id: 66, group: "K", stage: "groups", team1: "DR Congo", team2: "Uzbekistan", date: "2026-06-27T23:30:00Z", city: "Atlanta" },

    // ===== GROUP L =====
    { id: 67, group: "L", stage: "groups", team1: "England", team2: "Croatia", date: "2026-06-17T20:00:00Z", city: "Arlington" },
    { id: 68, group: "L", stage: "groups", team1: "Ghana", team2: "Panama", date: "2026-06-17T23:00:00Z", city: "Toronto" },
    { id: 69, group: "L", stage: "groups", team1: "England", team2: "Ghana", date: "2026-06-23T20:00:00Z", city: "Foxborough" },
    { id: 70, group: "L", stage: "groups", team1: "Panama", team2: "Croatia", date: "2026-06-23T23:00:00Z", city: "Foxborough" },
    { id: 71, group: "L", stage: "groups", team1: "Panama", team2: "England", date: "2026-06-27T21:00:00Z", city: "New Jersey" },
    { id: 72, group: "L", stage: "groups", team1: "Croatia", team2: "Ghana", date: "2026-06-27T21:00:00Z", city: "Philadelphia" },

    // ===== ROUND OF 32 =====
    { id: 73, stage: "r32", team1: "2A", team2: "2B", date: "2026-06-28T19:00:00Z", city: "Los Angeles", label: "2do A vs 2do B" },
    { id: 74, stage: "r32", team1: "1E", team2: "3ABCDF", date: "2026-06-29T20:30:00Z", city: "Foxborough", label: "1ro E vs 3ro (A/B/C/D/F)" },
    { id: 75, stage: "r32", team1: "1F", team2: "2C", date: "2026-06-30T01:00:00Z", city: "Guadalupe", label: "1ro F vs 2do C" },
    { id: 76, stage: "r32", team1: "1C", team2: "2F", date: "2026-06-29T17:00:00Z", city: "Houston", label: "1ro C vs 2do F" },
    { id: 77, stage: "r32", team1: "1I", team2: "3CDFGH", date: "2026-06-30T21:00:00Z", city: "New Jersey", label: "1ro I vs 3ro (C/D/F/G/H)" },
    { id: 78, stage: "r32", team1: "2E", team2: "2I", date: "2026-06-30T17:00:00Z", city: "Arlington", label: "2do E vs 2do I" },
    { id: 79, stage: "r32", team1: "1A", team2: "3CEFHI", date: "2026-07-01T01:00:00Z", city: "Mexico City", label: "1ro A vs 3ro (C/E/F/H/I)" },
    { id: 80, stage: "r32", team1: "1L", team2: "3EHIJK", date: "2026-07-01T16:00:00Z", city: "Atlanta", label: "1ro L vs 3ro (E/H/I/J/K)" },
    { id: 81, stage: "r32", team1: "1D", team2: "3BEFIJ", date: "2026-07-02T00:00:00Z", city: "Santa Clara", label: "1ro D vs 3ro (B/E/F/I/J)" },
    { id: 82, stage: "r32", team1: "1G", team2: "3AEHIJ", date: "2026-07-01T20:00:00Z", city: "Seattle", label: "1ro G vs 3ro (A/E/H/I/J)" },
    { id: 83, stage: "r32", team1: "2K", team2: "2L", date: "2026-07-02T23:00:00Z", city: "Toronto", label: "2do K vs 2do L" },
    { id: 84, stage: "r32", team1: "1H", team2: "2J", date: "2026-07-02T19:00:00Z", city: "Los Angeles", label: "1ro H vs 2do J" },
    { id: 85, stage: "r32", team1: "1B", team2: "3EFGIJ", date: "2026-07-03T03:00:00Z", city: "Vancouver", label: "1ro B vs 3ro (E/F/G/I/J)" },
    { id: 86, stage: "r32", team1: "1J", team2: "2H", date: "2026-07-03T22:00:00Z", city: "Miami", label: "1ro J vs 2do H" },
    { id: 87, stage: "r32", team1: "1K", team2: "3DEIJL", date: "2026-07-04T01:30:00Z", city: "Kansas City", label: "1ro K vs 3ro (D/E/I/J/L)" },
    { id: 88, stage: "r32", team1: "2D", team2: "2G", date: "2026-07-03T18:00:00Z", city: "Arlington", label: "2do D vs 2do G" },

    // ===== ROUND OF 16 =====
    { id: 89, stage: "r16", team1: "W74", team2: "W77", date: "2026-07-04T21:00:00Z", city: "Philadelphia", label: "Ganador M74 vs Ganador M77" },
    { id: 90, stage: "r16", team1: "W73", team2: "W75", date: "2026-07-04T17:00:00Z", city: "Houston", label: "Ganador M73 vs Ganador M75" },
    { id: 91, stage: "r16", team1: "W76", team2: "W78", date: "2026-07-05T20:00:00Z", city: "New Jersey", label: "Ganador M76 vs Ganador M78" },
    { id: 92, stage: "r16", team1: "W79", team2: "W80", date: "2026-07-06T00:00:00Z", city: "Mexico City", label: "Ganador M79 vs Ganador M80" },
    { id: 93, stage: "r16", team1: "W83", team2: "W84", date: "2026-07-06T19:00:00Z", city: "Arlington", label: "Ganador M83 vs Ganador M84" },
    { id: 94, stage: "r16", team1: "W81", team2: "W82", date: "2026-07-07T00:00:00Z", city: "Seattle", label: "Ganador M81 vs Ganador M82" },
    { id: 95, stage: "r16", team1: "W86", team2: "W88", date: "2026-07-07T16:00:00Z", city: "Atlanta", label: "Ganador M86 vs Ganador M88" },
    { id: 96, stage: "r16", team1: "W85", team2: "W87", date: "2026-07-07T20:00:00Z", city: "Vancouver", label: "Ganador M85 vs Ganador M87" },

    // ===== QUARTER-FINALS =====
    { id: 97, stage: "qf", team1: "W89", team2: "W90", date: "2026-07-09T20:00:00Z", city: "Foxborough", label: "Cuarto de Final 1" },
    { id: 98, stage: "qf", team1: "W91", team2: "W92", date: "2026-07-10T19:00:00Z", city: "Los Angeles", label: "Cuarto de Final 2" },
    { id: 99, stage: "qf", team1: "W93", team2: "W94", date: "2026-07-11T21:00:00Z", city: "Miami", label: "Cuarto de Final 3" },
    { id: 100, stage: "qf", team1: "W95", team2: "W96", date: "2026-07-12T01:00:00Z", city: "Kansas City", label: "Cuarto de Final 4" },

    // ===== SEMI-FINALS =====
    { id: 101, stage: "sf", team1: "W97", team2: "W98", date: "2026-07-14T19:00:00Z", city: "Arlington", label: "Semifinal 1" },
    { id: 102, stage: "sf", team1: "W99", team2: "W100", date: "2026-07-15T19:00:00Z", city: "Atlanta", label: "Semifinal 2" },

    // ===== THIRD PLACE =====
    { id: 103, stage: "final", team1: "L101", team2: "L102", date: "2026-07-18T21:00:00Z", city: "Miami", label: "Tercer Puesto" },

    // ===== FINAL =====
    { id: 104, stage: "final", team1: "W101", team2: "W102", date: "2026-07-19T19:00:00Z", city: "New Jersey", label: "GRAN FINAL" }
];

// Scoring system
const SCORING = {
    exact: 5,       // Exact score match
    goalDiff: 3,    // Correct result + correct goal difference
    result: 2,      // Correct result only (win/draw/loss)
    wrong: 0,       // Wrong prediction
    multipliers: {
        groups: 1,
        r32: 1.5,
        r16: 1.5,
        qf: 2,
        sf: 2.5,
        final: 3
    }
};

// Stage display names
const STAGE_NAMES = {
    groups: "Fase de Grupos",
    r32: "Treintaidosavos",
    r16: "Octavos de Final",
    qf: "Cuartos de Final",
    sf: "Semifinales",
    final: "Final"
};
