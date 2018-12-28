import { SchemaData, TypeData, getJsTypeName, typeIsRequired, generateTypeScriptType, getTypeName } from "./schema";
import { FileGenerator } from "./generator";

export class TypesGenerator extends FileGenerator {
    constructor(private schemaData: SchemaData, file: string) {
        super(file);
    }

    protected async getContent(): Promise<string> {
        const schema = this.schemaData.schema;

        const typeNames = (<any[]>schema.data.__schema.types).map<TypeData>((t: any) => this.schemaData.getTypeByName(t.name))
            .filter(type => this.schemaData.typeIsObject(type));

        const types = typeNames.map(name => this.schemaData.getTypeByName(name.name));

        let data = types
            .map(item => ({
                name: item.name,
                fields: (item.fields || item.inputFields).map((field: any) => ({ name: field.name, type: getJsTypeName(field.type), required: typeIsRequired(field.type) }))
            }))
            .map(item => `export type ${item.name} = ${generateTypeScriptType(item.fields)}`);

        data = data.concat(types.map(type => `export const ${type.name}StringFields = '${this.getTypeStringFields(type)}';`));

        return data.join('\n\n');
    }

    private getTypeStringFields(type: TypeData, parent: { [name: string]: number } = {}): string {
        const fields = (type.fields || type.inputFields);

        return fields.map(field => {
            const fieldsType = this.schemaData.getTypeByName(getTypeName(field.type));
            const fieldKey = `${field.name}-${fieldsType.name}`;
            const isObject = this.schemaData.typeIsObject(fieldsType);
            if (isObject) {
                if (!parent[fieldKey] || parent[fieldKey] < 1) {
                    parent[fieldKey] = parent[fieldKey] || 0;
                    parent[fieldKey]++;
                    return `${field.name} { ${this.getTypeStringFields(fieldsType, parent)} }`;
                } else {
                    // console.log(`no object: ${field.name} ${fieldsType.name}, ${JSON.stringify(parent)}`)
                    // return field.name;
                }
            } else {
                return field.name;
            }
        })
            .filter(item => !!item)
            .join(' ');
    }
}
