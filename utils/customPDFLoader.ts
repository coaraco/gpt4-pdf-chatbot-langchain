import { PdfReader } from "pdfreader";
import { Document } from 'langchain/document';
import { readFile } from 'fs/promises';
import { BaseDocumentLoader } from 'langchain/document_loaders';

export abstract class BufferLoader extends BaseDocumentLoader {
  constructor(public filePathOrBlob: string | Blob) {
    super();
  }

  protected abstract parse(
    raw: Buffer,
    metadata: Document['metadata'],
  ): Promise<Document[]>;

  public async load(): Promise<Document[]> {
    let buffer: Buffer;
    let metadata: Record<string, string>;
    if (typeof this.filePathOrBlob === 'string') {
      buffer = await readFile(this.filePathOrBlob);
      metadata = { source: this.filePathOrBlob };
    } else {
      buffer = await this.filePathOrBlob
        .arrayBuffer()
        .then((ab) => Buffer.from(ab));
      metadata = { source: 'blob', blobType: this.filePathOrBlob.type };
    }
    return this.parse(buffer, metadata);
  }
}

export class CustomPDFLoader extends BufferLoader {
  public async parse(
    raw: Buffer,
    metadata: Document['metadata'],
  ): Promise<Document[]> {
    const pdf = await PDFLoaderImports(metadata.source);

    return [
      ...pdf.map((pageContent: string, index: number) =>
        new Document({
          pageContent: pageContent || "",
          metadata: {
            ...metadata,
            pdf_numpages: pdf.length,
            current_page: index,
          },
        }),
      )
    ].filter(Boolean);
  }
}

async function PDFLoaderImports(filePath: string): Promise<any> {
  const reader = new PdfReader();
  const pages: string[] = [];

  let parsingPage: number = 0;

  return new Promise(resolve => {
    reader.parseFileItems(filePath, (_: any, item: any) => {
      if (!item) return resolve(pages.map(page => page || ""));

      if (item.page) parsingPage = item.page;

      if (item.text) {
        if (!pages[parsingPage]) pages[parsingPage] = "";
        pages[parsingPage] += item.text;
      }
    });
  });
}
