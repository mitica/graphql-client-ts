import { GraphQlQueryExecutor } from "./graphql-executor";
import { Index } from "./utils";
import * as LRU from 'lru-cache';
import { GraphQlQueryType, GraphQlQueryItems, GraphQlRequestResult, GraphQlQueryItem } from "./graphql";

const debug = require('debug')('gamebot:api-client');

export type CacheGraphQlQueryExecutorOptions = {
    /**
     * Index is the name of GraphQL method
     */
    [index: string]: { max: number, ttl: number }
}

export class CacheGraphQlQueryExecutor extends GraphQlQueryExecutor {
    private storage: { [key: string]: LRU.Cache<string, any> } = {}
    constructor({ url, headers }: { url: string, headers?: Index<string> }, options: CacheGraphQlQueryExecutorOptions) {
        super(url, headers);
        for (let key of Object.keys(options)) {
            this.storage[key] = new LRU({ max: options[key].max, maxAge: options[key].ttl });
        }
    }

    async execute<T>(type: GraphQlQueryType, items: GraphQlQueryItems): Promise<GraphQlRequestResult<T>> {
        if (type !== 'query') {
            return super.execute<T>(type, items);
        }
        const result: GraphQlRequestResult<T> = { data: {} as T };
        const nonCacheItems: GraphQlQueryItems = {}
        const keys = Object.keys(items);
        let hasNonCacheItems = false;
        for (let key of keys) {
            const item = items[key];
            const cache = this.storage[item.name];
            if (cache) {
                const itemKey = this.createItemKey(item);
                const value = cache.get(itemKey);
                if (value !== undefined) {
                    // debug(`get item from cache: ${key} - ${itemKey}`);
                    (<any>result.data)[key] = value;
                    continue;
                }
            }
            nonCacheItems[key] = item;
            hasNonCacheItems = true;
        }

        if (!hasNonCacheItems) {
            debug(`none non-cache items!`)
            return result;
        }

        const remoteResult = await super.execute<T>(type, nonCacheItems);

        if (remoteResult.data) {
            this.setCacheData(remoteResult.data, nonCacheItems);
        }

        result.data = Object.assign(result.data, remoteResult.data);
        if (remoteResult.errors) {
            result.errors = remoteResult.errors;
        }

        return result;
    }

    private setCacheData(data: any, items: GraphQlQueryItems) {
        for (let key in data) {
            const item = items[key];
            const cache = this.storage[item.name];
            if (!cache) {
                continue;
            }
            const value = data[key];
            if (value !== undefined) {
                const itemKey = this.createItemKey(item);
                cache.set(itemKey, value);

                // debug(`set cache item: ${key} - ${itemKey}`)
            }
        }
    }

    private createItemKey(item: GraphQlQueryItem<string>) {
        return item.name + '#' + (item.variables ? JSON.stringify(item.variables.map(item=>item.value)) : '') + '#' + item.fields || '';
    }
}
