import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { queryOptions } from "@tanstack/react-query"

// only the coarse country code Cloudflare's own edge already attaches
// to every request (the same class of signal any network intermediary
// already sees, not the visitor's IP itself or anything finer grained
// like city or coordinates); used only for the home hero's "your
// country" line, the engineer's explicit call, made after flagging
// that it reverses spec 0003-resource-directory AC-6's default of
// never auto-detecting location. AC-6 still governs every other
// surface: the /r picker stays entirely manual.
export const getVisitorCountry = createServerFn({ method: "GET" }).handler(
    async () => {
        const request = getRequest() as Request & {
            cf?: { country?: string }
        }
        return { countryCode: request.cf?.country ?? null }
    }
)

export const visitorCountryQueryOptions = () =>
    queryOptions({
        queryKey: ["visitor-country"],
        queryFn: () => getVisitorCountry(),
    })
