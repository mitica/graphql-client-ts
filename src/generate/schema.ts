import { writeFileSync } from "fs";
import { join } from "path";
import fetch from '../fetch';
import { parse } from "url";

export class SchemaData {
    constructor(readonly schema: any) {
    }

    getTypeByName(name: string): TypeData {
        return this.schema.data.__schema.types.find((type: TypeData) => type.name === name)
    }

    typeIsObject(type: TypeData) {
        return this.isOfType(type, ['OBJECT', 'INPUT_OBJECT']);
    }

    typeIsObjectOrEnum(type: TypeData) {
        return this.isOfType(type, ['OBJECT', 'INPUT_OBJECT', 'ENUM']);
    }

    typeIsEnum(type: TypeData) {
        return this.isOfType(type, ['ENUM']);
    }

    isOfType(type: TypeData, types: string[]) {
        const schema = this.schema;

        const invalidNames: string[] = [schema.data.__schema['queryType'].name];
        if (schema.data.__schema['mutationType']) {
            invalidNames.push(schema.data.__schema['mutationType'].name);
        }
        const name = getTypeName(type);
        const kind = getTypeKind(type);
        return name.indexOf('__') !== 0 && invalidNames.indexOf(name) < 0 && types.indexOf(kind) > -1;
    }

    static async create(url: string, headers?: any) {

        if (!url) {
            throw new Error(`url is required!`);
        }

        headers = headers || {};
        headers['content-type'] = headers['content-type'] || 'application/json';
        const parsedUrl = parse(url);
        headers['origin'] = headers['origin'] || `${parsedUrl.protocol}//${parsedUrl.hostname}`;

        // console.log('headers', headers)

        const response = await fetch(url, { headers, body: JSON.stringify({ query: schemaQuery, variables: null }), method: 'POST' });
        if (response.status >= 400) {
            const data = await response.text();
            throw new Error(`Bad response(${response.status}) from server: ${data}`);
        }
        const schema = await response.json()

        return new SchemaData(schema);
    }
}

const schemaQuery = '\n    query IntrospectionQuery {\n      __schema {\n        queryType { name }\n        mutationType { name }\n        subscriptionType { name }\n        types {\n          ...FullType\n        }\n        directives {\n          name\n          description\n          locations\n          args {\n            ...InputValue\n          }\n        }\n      }\n    }\n\n    fragment FullType on __Type {\n      kind\n      name\n      description\n      fields(includeDeprecated: true) {\n        name\n        description\n        args {\n          ...InputValue\n        }\n        type {\n          ...TypeRef\n        }\n        isDeprecated\n        deprecationReason\n      }\n      inputFields {\n        ...InputValue\n      }\n      interfaces {\n        ...TypeRef\n      }\n      enumValues(includeDeprecated: true) {\n        name\n        description\n        isDeprecated\n        deprecationReason\n      }\n      possibleTypes {\n        ...TypeRef\n      }\n    }\n\n    fragment InputValue on __InputValue {\n      name\n      description\n      type { ...TypeRef }\n      defaultValue\n    }\n\n    fragment TypeRef on __Type {\n      kind\n      name\n      ofType {\n        kind\n        name\n        ofType {\n          kind\n          name\n          ofType {\n            kind\n            name\n            ofType {\n              kind\n              name\n              ofType {\n                kind\n                name\n                ofType {\n                  kind\n                  name\n                  ofType {\n                    kind\n                    name\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  ';

export function saveCodeFile(data: GeneratedInfo[], fileName: string) {
    const content = data.map(item => item.data).join('\n\n');
    writeFileSync(join(__dirname, '..', '..', 'src', fileName + '.ts'), content, 'utf8');
}

export function generateTypeScriptType(items: { name: string, type: string, required: boolean }[]): string {
    return `{ ${items.map(item => `${item.name}${item.required ? '' : '?'}: ${item.type}`).join(', ')} } `;
}

export function generateEnumScript(items: { name: string }[]): string {
    return `{ ${items.map(item => `${item.name}`).join(', ')} } `;
}

export function getJsTypeName(type: TypeData) {
    const name = getTypeName(type);
    let jsName: string = name;
    switch (name) {
        case 'ID':
        case 'String':
            jsName = 'string';
            break;
        case 'Int':
        case 'Float':
            jsName = 'number';
            break;
        case 'JSON':
            jsName = 'any';
            break;
        case 'Boolean':
            jsName = 'boolean';
            break;
    }

    if (typeIsList(type)) {
        jsName += '[]';
    }

    return jsName;
}

export function typeIsList(type: TypeData) {
    return type.kind === 'NON_NULL' && type.ofType.kind === 'LIST' || type.kind === 'LIST'
}

export function typeIsRequired(type: TypeData) {
    return type.kind === 'NON_NULL'
}

export function getTypeName(type: TypeData): string {
    if (~['NON_NULL', 'LIST'].indexOf(type.kind)) {
        return getTypeName(type.ofType);
    }
    return type.name;
}

export function getTypeKind(type: TypeData): string {
    if (~['NON_NULL', 'LIST'].indexOf(type.kind)) {
        return getTypeKind(type.ofType);
    }
    return type.kind;
}

export type GeneratedInfo = {
    name: string
    data: string
}

export type TypeData = {
    kind: string
    name: string
    fields?: TypeFieldData[]
    inputFields?: TypeFieldData[]
    enumValues?: TypeFieldData[]
    ofType?: TypeData
}

export type TypeFieldData = {
    name: string
    args: TypeArgData[]
    type: TypeData
}

export type TypeArgData = {
    name: string
    type: TypeData
}

export type ActionType = 'query' | 'mutation';