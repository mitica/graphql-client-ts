import { Index } from "./utils";

export interface IDataMapper<R=any, V=any> {
    (value: V): R
}

export type GraphQlQueryItem<TName extends string> = {
    name: TName
    fields?: string
    variables?: { type?: string, name: string, value: any, varName?: string }[]
    mapper?: IDataMapper
}

export type GraphQlQueryItemInput = {
    fields: string
}

export type GraphQlRequestResult<T={}> = {
    data: T
    errors?: Error[]
}

export type GraphQlQueryType = 'query' | 'mutation';
export interface GraphQlQueryItems<TName extends string=string> { [index: string]: GraphQlQueryItem<TName> }

export interface IGraphQlQueryExecutor {
    execute<T>(type: GraphQlQueryType, items: GraphQlQueryItems, headers?: Index<string>): Promise<GraphQlRequestResult<T>>
}
