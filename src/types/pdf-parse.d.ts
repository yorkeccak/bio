declare module "pdf-parse" {
  export interface PdfData {
    text: string;
    numpages?: number;
    numrender?: number;
    info?: Record<string, any>;
    metadata?: any;
    version?: string;
  }
  function pdf(buffer: Buffer): Promise<PdfData>;
  export default pdf;
}
