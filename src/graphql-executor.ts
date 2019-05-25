import { Index, timeout } from "./utils";
import {
  GraphQlRequestResult,
  GraphQlQueryType,
  GraphQlQueryItems,
  IGraphQlQueryExecutor
} from "./graphql";

export type GraphQLQueryExecutorData = {
  query: string;
  variables: Index<any>;
};

export interface IGraphQlQueryExecutorRequest {
  (data: string): Promise<any>;
}

export class GraphQlQueryExecutor implements IGraphQlQueryExecutor {
  constructor(private request: IGraphQlQueryExecutorRequest) {}

  execute<T>(
    type: GraphQlQueryType,
    items: GraphQlQueryItems
  ): Promise<GraphQlRequestResult<T>> {
    // debug(`executing url ${this.url}`);
    const data = this.formatQueryData(type, items);
    // debug(`executing data ${JSON.stringify(data)}`);
    return this.fetch(data);
  }

  protected async fetch(data: GraphQLQueryExecutorData) {
    const response = await timeout(
      1000 * 3,
      this.request(JSON.stringify(data))
    );

    return response;
  }

  protected formatQueryData(
    type: GraphQlQueryType,
    items: GraphQlQueryItems
  ): GraphQLQueryExecutorData {
    const variables: Index<any> = {};
    let query: string = type + " queryName";
    const queryParams: Index<any> = {};
    let varCount = 0;
    const keys = Object.keys(items);
    const body = keys
      .map(key => {
        const item = items[key];
        let body = key + ":" + item.name;
        if (item.variables) {
          item.variables.forEach(v => {
            v.varName = "$input" + varCount;
            queryParams[v.varName] = v.type || "String!";
            variables[v.varName.substr(1)] = v.value;
            varCount++;
          });
          if (varCount > 0) {
            body +=
              "(" +
              item.variables.map(v => v.name + ":" + v.varName).join(", ") +
              ")";
          }
        }
        if (item.fields) {
          body += "{" + item.fields + "}";
        }
        return body;
      })
      .join(",");

    if (Object.keys(queryParams).length) {
      query +=
        "(" +
        Object.keys(queryParams)
          .map(key => key + ":" + queryParams[key])
          .join(",") +
        ")";
    }

    query += "{" + body + "}";

    return { query, variables };
  }
}
