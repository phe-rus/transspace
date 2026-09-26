// spec 0005 AC-19: the critical-tier geo lock's restricted list, a code
// constant rather than a database table, so a change to who is protected
// goes through the same code review and git history as any other code
// change, not an unreviewed live edit.
//
// Seeded from ILGA World's "State-Sponsored Homophobia" criminalization
// map. This list is deliberately conservative: it only includes countries
// with long-standing, clearly documented criminalization, since the
// underlying laws and their enforcement change over time and this list
// was compiled from the model's training knowledge, not a live fetch of
// a current source. Before this feature ships, a moderator or counsel
// should cross-check it against the current edition of that map (or an
// equivalent current source) and correct anything stale, then keep it
// current the same way. ISO 3166-1 alpha-2 codes, matching what
// Cloudflare's request.cf.country returns.
export const RESTRICTED_COUNTRY_CODES: readonly string[] = [
    "NG", // Nigeria
    "UG", // Uganda
    "KE", // Kenya
    "TZ", // Tanzania
    "SO", // Somalia
    "SD", // Sudan
    "SS", // South Sudan
    "LY", // Libya
    "DZ", // Algeria
    "TN", // Tunisia
    "MA", // Morocco
    "MR", // Mauritania
    "SN", // Senegal
    "CM", // Cameroon
    "ZM", // Zambia
    "ZW", // Zimbabwe
    "MW", // Malawi
    "ET", // Ethiopia
    "ER", // Eritrea
    "EG", // Egypt
    "IR", // Iran
    "SA", // Saudi Arabia
    "YE", // Yemen
    "QA", // Qatar
    "KW", // Kuwait
    "AE", // United Arab Emirates
    "AF", // Afghanistan
    "PK", // Pakistan
    "BD", // Bangladesh
    "MY", // Malaysia
    "BN", // Brunei
    "MM", // Myanmar
    "TM", // Turkmenistan
    "UZ", // Uzbekistan
    "PG", // Papua New Guinea
    "JM", // Jamaica
]
