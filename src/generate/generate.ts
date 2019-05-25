import program = require("commander");
import { SchemaData } from "./schema";
import { TypesGenerator } from "./types-generator";
import { join } from "path";
import { ApiGenerator } from "./api-generator";
import { ClientGenerator } from "./client-generator";

program
  .version("0.1.0")
  .option("-o, --output <value>", "Output path")
  .option("-p, --endpoint <value>", "Api endpoint")
  .option("-h, --headers [value]", "Headers", h => JSON.parse(h))
  .parse(process.argv);

const output: string = program.output || process.cwd();
const endpoint = program.endpoint as string;
const headers = program.headers;

if (!endpoint) {
  throw new Error(`--endpoint is required!`);
}

async function run() {
  console.log(`output: ${output}`);
  console.log(`endpoint: ${endpoint}`);
  console.log(`headers: ${headers}`);

  const schemaData = await SchemaData.create(endpoint, headers);

  const typesFilename = "api-types";
  const typesGenerator = new TypesGenerator(
    schemaData,
    join(output, typesFilename + ".ts")
  );
  const queryApiFilename = "query-api";
  const queryApiGenerator = new ApiGenerator(
    schemaData,
    join(output, queryApiFilename + ".ts"),
    "query",
    typesFilename
  );
  const mutationApiFilename = "mutation-api";
  const mutationApiGenerator = new ApiGenerator(
    schemaData,
    join(output, mutationApiFilename + ".ts"),
    "mutation",
    typesFilename
  );
  const clientFilename = "graphql-client";
  const clientGenerator = new ClientGenerator(
    join(output, clientFilename + ".ts"),
    queryApiFilename,
    mutationApiFilename
  );

  await typesGenerator.generate();
  await queryApiGenerator.generate();
  await mutationApiGenerator.generate();
  await clientGenerator.generate();
}

run()
  .then(() => console.log("OK!"))
  .catch(e => console.trace(e));
