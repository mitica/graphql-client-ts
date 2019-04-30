import { GraphQlQueryItems, GraphQlQueryType, GraphQlQueryItem, GraphQlRequestResult, IGraphQlQueryExecutor } from "./graphql";



export class GraphQlQuery<T extends {}, TName extends string> {
    private items: GraphQlQueryItems<TName> = {};

    constructor(private executor: IGraphQlQueryExecutor, private type: GraphQlQueryType) { }

    queryHasItems() {
        return Object.keys(this.items).length > 0;
    }

    queryAddItem(key: keyof T, item: GraphQlQueryItem<TName>) {
        (<any>this.items)[key] = item;
        return this;
    }

    async queryExecute(): Promise<GraphQlRequestResult<T>> {
        const result = await this.executor.execute<T>(this.type, this.items);
        const keys = Object.keys(this.items);
        for (let key of keys) {
            if (this.items[key].mapper) {
                (<any>result.data)[key] = this.items[key].mapper((<any>result.data)[key]);
            }
        }

        return result;
    }
}
