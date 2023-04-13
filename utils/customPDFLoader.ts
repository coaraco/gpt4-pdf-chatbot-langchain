import { Document } from 'langchain/document';
import { readFile } from 'fs/promises';
import { BaseDocumentLoader } from 'langchain/document_loaders';

const PAGESEPARATORREGEX = /(\|\s\d|\d+\s*\|)/;

const componentsFiles = {
  "Main Engine stb": ["82e9c553-1b30-427e-b889-e7a0c2f0201b.pdf", "6cd3e5ac-a7e9-4e63-87d7-b90ec694d1f9.pdf", "a39d0cb1-106e-4a83-9177-9d676968a74a.pdf"],
  "Main Engine Port": ["e23f99f4-cf0b-48d5-9cda-30491dfcc482.pdf", "d26d6187-fc52-4aaf-8855-cb717c6ae067.pdf", "74f3674c-edc9-4975-90cf-afbd51e35836.pdf"],
  "Gearbox Stb": ["zf-5000-series-operating-instructions.pdf"],
  "Exhaust water Separator Port & Stb M/E": ["f0709af7-3764-44a1-a7a9-7b79b700ec1f.pdf"],
  "PTO M/E port": ["9880266d-073c-4d79-8097-36613b8e8721.pdf"],
  "PTO M/E Stb": ["d5a82a0e-365c-43e3-99af-d671d7a632bd.pdf"],
}

export abstract class BufferLoader extends BaseDocumentLoader {
  constructor(public filePathOrBlob: string | Blob) {
    super();
  }

  protected abstract parse(
    raw: Buffer,
    metadata: Document['metadata'],
  ): Promise<Document[]>;

  public async load(): Promise<Document[] | null> {
    let buffer: Buffer;
    let metadata: Record<string, string | null>;
    if (typeof this.filePathOrBlob === 'string') {
      const component = Object.entries(componentsFiles).map(([component, paths]) => paths.includes((this.filePathOrBlob).split("/docs/").pop()) ? component : null).filter(Boolean)[0]
      buffer = await readFile(this.filePathOrBlob);
      metadata = { source: this.filePathOrBlob, component };
    } else {
      buffer = await this.filePathOrBlob
        .arrayBuffer()
        .then((ab) => Buffer.from(ab));
      metadata = { source: 'blob', blobType: this.filePathOrBlob.type };
    }
    console.log("metadata", metadata);
    return this.parse(buffer, metadata);
  }
}

export class CustomPDFLoader extends BufferLoader {
  public async parse(
    raw: Buffer,
    metadata: Document['metadata'],
  ): Promise<Document[]> {
    const { pdf } = await PDFLoaderImports();
    const parsed = await pdf(raw);
    const pages = (parsed.text as string).split(PAGESEPARATORREGEX);
    return pages.map((pageContent: string, i: number) => {
      const page_number = i + 1;
      return new Document({
        pageContent,
        metadata: {
          ...metadata,
          document_name: metadata.source.split("/docs/").pop(),
          link: `${metadata.source.split("/docs").pop()}#page=${page_number}`,
          page_number,
        }
      })
    })
  }
}

async function PDFLoaderImports() {
  try {
    // the main entrypoint has some debug code that we don't want to import
    const { default: pdf } = await import('pdf-parse/lib/pdf-parse.js');
    return { pdf };
  } catch (e) {
    console.error(e);
    throw new Error(
      'Failed to load pdf-parse. Please install it with eg. `npm install pdf-parse`.',
    );
  }
}
