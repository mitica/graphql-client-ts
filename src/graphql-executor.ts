import { Index, timeout } from "./utils";
import { GraphQlRequestResult, GraphQlQueryType, GraphQlQueryItems, IGraphQlQueryExecutor } from "./graphql";
import fetch from 'cross-fetch';

export type GraphQLQueryExecutorData = {
    query: string
    variables: Index<any>
}

export class GraphQlQueryExecutor implements IGraphQlQueryExecutor {
    constructor(private url: string, private headers: Index<string> = { 'Content-Type': 'application/json' }) { }

    execute<T>(type: GraphQlQueryType, items: GraphQlQueryItems, headers?: Index<string>): Promise<GraphQlRequestResult<T>> {
        // debug(`executing url ${this.url}`);
        const data = this.formatQueryData(type, items);
        // debug(`executing data ${JSON.stringify(data)}`);
        return this.fetch(data, headers);
    }

    protected async fetch(data: GraphQLQueryExecutorData, headers?: Index<string>) {
        const response = await timeout(1000 * 3, fetch(this.url, {
            method: 'POST',
            headers: { ...this.headers, ...headers },
            body: JSON.stringify(data),
        }));

        if (response.status >= 400) {
            throw new Error("Bad response from server");
        }

        return await response.json();
    }

    protected formatQueryData(type: GraphQlQueryType, items: GraphQlQueryItems): GraphQLQueryExecutorData {
        const variables: Index<any> = {};
        let query: string = type + ' queryName';
        const queryParams: Index<any> = {};
        let varCount = 0;
        const keys = Object.keys(items);
        const body = keys.map(key => {
            const item = items[key];
            let body = key + ':' + item.name;
            if (item.variables) {
                item.variables.forEach(v => {
                    v.varName = '$input' + varCount;
                    queryParams[v.varName] = v.type || 'String!';
                    variables[v.varName.substr(1)] = v.value;
                    varCount++;
                });
                body += '(' + item.variables.map(v => v.name + ':' + v.varName).join(', ') + ')';
            }
            if (item.fields) {
                body += '{' + item.fields + '}';
            }
            return body;
        }).join(',');

        if (Object.keys(queryParams).length) {
            query += '(' + Object.keys(queryParams).map(key => key + ':' + queryParams[key]).join(',') + ')';
        }

        query += '{' + body + '}';

        return { query, variables };
    }
}
