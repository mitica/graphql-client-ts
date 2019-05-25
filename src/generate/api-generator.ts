import { FileGenerator } from "./generator";
import {
  ActionType,
  SchemaData,
  TypeData,
  GeneratedInfo,
  typeIsRequired,
  typeIsList,
  getTypeName,
  getJsTypeName,
  generateTypeScriptType
} from "./schema";
import { startWithUpperCase, uniq } from "../utils";

export class ApiGenerator extends FileGenerator {
  constructor(
    private schemaData: SchemaData,
    file: string,
    private type: ActionType,
    private apiTypesFilename: string
  ) {
    super(file);
  }

  protected async getContent(): Promise<string> {
    const methods =
      this.type === "mutation"
        ? this.generateMutationMethods()
        : this.generateQueryMethods();
    const api = this.generateApi(this.type);

    return [api.data, methods.data].join("\n\n");
  }

  protected generateMutationMethods(): GeneratedInfo {
    const schema = this.schemaData.schema;
    let type: TypeData;
    if (schema.data.__schema["mutationType"]) {
      const typeName: string = schema.data.__schema["mutationType"].name;
      type = this.schemaData.getTypeByName(typeName);
    }
    return generateMethods("mutation", type);
  }
  protected generateQueryMethods(): GeneratedInfo {
    const schema = this.schemaData.schema;
    const typeName: string = schema.data.__schema["queryType"].name;
    const type = this.schemaData.getTypeByName(typeName);
    return generateMethods("query", type);
  }

  protected generateApi(action: ActionType) {
    return generateApi(action, this.schemaData, this.apiTypesFilename);
  }
}

function generateApi(
  action: ActionType,
  schemaData: SchemaData,
  apiTypesFilename: string
) {
  const schema = schemaData.schema;
  const typeExists = !!schema.data.__schema[action + "Type"];

  const type = typeExists
    ? schemaData.getTypeByName(schema.data.__schema[action + "Type"].name)
    : ({ fields: [] } as any);
  const upperAction = startWithUpperCase(action);

  const importedTypes: string[] = [];
  let hasDataField = false;

  const methods = type.fields.map((field: any) => {
    const methodName = field.name.includes("_")
      ? field.name.split("_")[0] + startWithUpperCase(field.name.split("_")[1])
      : field.name;
    const methodArgsData = [{ name: "key", type: "keyof T" }];

    const resultIsObject =
      schemaData.typeIsObject(field.type) ||
      (typeIsList(field.type) &&
        schemaData.typeIsObject(field.type.ofType.ofType));

    if (resultIsObject) {
      methodArgsData.push({ name: "data", type: "GraphQlQueryItemInput" });
      hasDataField = true;
    }
    const argData = {
      name: "args",
      type: generateTypeScriptType(
        field.args.map((arg: any) => {
          const typeName = getJsTypeName(arg.type);
          if (schemaData.typeIsObject(arg.type)) {
            importedTypes.push(getTypeName(arg.type));
          }
          return {
            name: arg.name,
            type: typeName,
            required: typeIsRequired(arg.type)
          };
        })
      )
    };
    if (field.args && field.args.length) {
      methodArgsData.push(argData);
    }

    const resultJsType = getJsTypeName(field.type);
    if (schemaData.typeIsObject(field.type)) {
      importedTypes.push(getTypeName(field.type));
    }

    methodArgsData.push({
      name: "mapper?",
      type: `IDataMapper<MR, ${resultJsType}>`
    });

    const methodArgs = methodArgsData.map(item => `${item.name}:${item.type}`);

    const variables = field.args.map((arg: any) => {
      let typeName = getTypeName(arg.type);
      if (typeIsList(arg.type)) {
        if (
          arg.type.ofType &&
          arg.type.ofType.ofType &&
          typeIsRequired(arg.type.ofType.ofType)
        ) {
          typeName += "!";
        }
        typeName = `[${typeName}]`;
      }
      if (typeIsRequired(arg.type)) {
        typeName += "!";
      }
      return `{ name: '${arg.name}', value: args.${
        arg.name
      }, type: '${typeName}' }`;
    });

    const methodBody = `return this._client.queryAddItem(key,
            {
                ${resultIsObject ? "fields: data.fields," : ""}
                name: ${upperAction}Methods.${field.name},
                mapper: mapper,
                variables: [
                    ${variables.join(",\n")}
                ]
            })`;

    return `${methodName}<MR>(${methodArgs.join(",\n")}) {
        
        ${methodBody}
    }`;
  });

  const data = `
import { ${uniq(importedTypes).join(", ")} } from './${apiTypesFilename}';
import { GraphQlRequestResult, GraphQlQuery, IGraphQlQueryExecutor, ${
    hasDataField ? "GraphQlQueryItemInput," : ""
  } IDataMapper } from 'graphql-client-ts';

export class ${upperAction}Api<T> {
    protected _client: GraphQlQuery<T, ${upperAction}Methods>;
    constructor(executor: IGraphQlQueryExecutor) {
        this._client = new GraphQlQuery<T, ${upperAction}Methods>(executor, '${action}');
    }
    queryHasItems() {
        return this._client.queryHasItems();
    }
    async queryExecute(): Promise<GraphQlRequestResult<T>> {
        return this._client.queryExecute();
    }
    ${methods.join("\n\n")}
}
    `;

  return {
    name: `${upperAction}Api`,
    data
  };
}

function generateMethods(action: ActionType, type: TypeData): GeneratedInfo {
  const names = type
    ? type.fields.map(field => `    ${field.name} = "${field.name}"`)
    : [];
  const name = `${startWithUpperCase(action)}Methods`;
  const data = `export enum ${name} {
${names.join(",\n")}
}`;

  return { name, data };
}
