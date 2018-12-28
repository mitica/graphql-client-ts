import { FileGenerator } from "./generator";

export class ClientGenerator extends FileGenerator {
    constructor(file: string, private queryApiFilename: string, private mutationApiFilename: string) {
        super(file);
    }

    protected async getContent(): Promise<string> {
        const code = `
import { QueryApi } from './${this.queryApiFilename}';
import { MutationApi } from './${this.mutationApiFilename}';
import { IGraphQlQueryExecutor } from 'graphql-client-ts';


export class GraphQLClient {
    constructor(protected readonly executor: IGraphQlQueryExecutor) { }

    query<T extends {}>() {
        return new QueryApi<T>(this.executor);
    }

    mutation<T extends {}>() {
        return new MutationApi<T>(this.executor);
    }
}`;

        return code;
    }

}
