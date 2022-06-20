import axios from "axios";
import dayjs from "dayjs";

import path from "path";
import { promises as fs } from "fs";

namespace SpotifyApi {
    export class Request {
        url: string;
        headers: Record<string, string>;
        constructor(endpoint: string, access_token: string) {
            this.url = "https://api.spotify.com/v1" + (endpoint.startsWith("/") ? "" : "/") + endpoint;
            this.headers = {
                "Authorization": "Bearer " + access_token,
                "Content-Type": "application/json",
            };
        }
        async get(query?: Record<string, string>) {
            const req = axios({
                method: "get",
                url: this.url + "?" + (new URLSearchParams(query || {})).toString(),
                headers: this.headers,
            });

            req.catch((err) => {
                console.log(err.config);
                console.log(err.response.data);
            });

            const res = await req;
            return res.data;
        }
    }

    interface GetRecentlyPlayedQuery {
        after: string | number;
        before: string | number;
        limit: string | number;
    }
    export interface GetRecentlyPlayedItemsObject {
        track: BasicResponseObject & {
            album: BasicResponseObject & {
                album_type: string;
                artists: BasicResponseObject[];
                available_markets: string[];
                images: {
                    height: number;
                    url: string;
                    width: number;
                }[];
                release_date: string;
                release_date_precision: string;
                total_tracks: number;
            };
            artists: BasicResponseObject[];
            available_markets: string[];
            disc_number: number;
            duration_ms: number;
            explicit: boolean;
            external_ids: Record<string, string>;
            is_local: boolean;
            popularity: number;
            preview_url: string;
            track_number: number;
            type: string;
        };
        played_at: string;
        context: Partial<BasicResponseObject>;
    }
    interface GetRecentlyPlayedResponseBody {
        href: string;
        items: GetRecentlyPlayedItemsObject[];
        limit: number;
        next: string | null;
        cursors: {
            after?: string;
            before?: string;
        } | null;
        total: number;
    }
    interface BasicResponseObject {
        external_urls: Record<string, string>;
        href: string;
        id: string;
        name: string;
        type: string;
        uri: string;       
    }
    export class GetRecentlyPlayed extends Request {
        constructor(access_token: string) {
            super("/me/player/recently-played", access_token);
        }

        get(query?: Partial<GetRecentlyPlayedQuery>) {
            const modifiedQuery: Partial<Record<keyof GetRecentlyPlayedQuery, string>> = {};
            if (query) {
                for (let _ in query) {
                    let key = _ as keyof GetRecentlyPlayedQuery;
                    let val = query[key];

                    if (typeof val === "number") {
                        modifiedQuery[key] = val.toString();
                    }
                }
            }

            return super.get(modifiedQuery) as Promise<GetRecentlyPlayedResponseBody>;
        }
    }
}

type Config = Partial<{
    after: dayjs.Dayjs;
    until: dayjs.Dayjs;

    amount: number;

    // Might rename to something else
    overrides: Partial<{
        limit_per_request: number;
    }>
}>;

interface MainConfig {
    auth: {
        code: string;
        client_id: string;
        client_secret: string;
    };
    config?: Config;
}

export default async function main(config: MainConfig) {
    const { code, client_id, client_secret } = config.auth;
    let options = config.config;

    if (!options) 
        options = {
            // after: 
            until: dayjs().subtract(1, "day")

            // amount: 

            /*
            overrides: {
                limit_per_request: 
            }
            */
        }
    
    const req = axios({
        method: "post",
        url: "https://accounts.spotify.com/api/token",
        data: (new URLSearchParams({
            code,
            redirect_uri: "http://localhost:8101/callback",
            grant_type: "authorization_code",
        })).toString(),
        headers: {
            "Authorization": "Basic " + (Buffer.from(client_id + ":" + client_secret).toString("base64")),
            "Content-Type": "application/x-www-form-urlencoded",
        },
        responseType: "json",
    });

    req.catch((err) => {
        console.log(err);
    });

    const res = await req;

    interface AccessTokenResult {
        access_token: string;
        token_type: string;
        scope: string;
        expires_int: string;
        refresh_token: string;
    }

    const data = res.data as AccessTokenResult;
    const token = data.access_token;

    const { until } = options;

    const result: SpotifyApi.GetRecentlyPlayedItemsObject[] = [];

    if (until) {
        let lastCursor = +dayjs();

        const request = new SpotifyApi.GetRecentlyPlayed(token);

        while (lastCursor > +until) {
            const response = await request.get({ before: lastCursor, limit: 10 });

            if (response.cursors === null)
                break;

            const { before } = response.cursors;
            if (!before)
                break;

            lastCursor = +before;

            result.push(...response.items);
        }
    }

    if (result.length)
        await fs.writeFile(path.resolve(`./out/result-${+new Date()}.json`), JSON.stringify(result, null, 4));
};
