declare module "mammoth" {
  type MammothInput = { buffer: Buffer };
  type MammothResult = { value: string };
  const mammoth: {
    extractRawText(input: MammothInput): Promise<MammothResult>;
    convertToHtml?: (input: MammothInput) => Promise<MammothResult>;
    convertToMarkdown?: (input: MammothInput) => Promise<MammothResult>;
  };
  export default mammoth;
}
