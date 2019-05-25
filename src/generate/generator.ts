import { writeFileSync } from "fs";

export abstract class FileGenerator {
  constructor(private file: string) {}

  async generate() {
    const content = await this.getContent();

    writeFileSync(this.file, content, "utf8");
  }

  protected abstract getContent(): Promise<string>;
}
