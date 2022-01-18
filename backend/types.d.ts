declare module 'html-to-text' {
  function fromString(
    html: string,
    options: {
      wordwrap?: number | string;
    },
  ): string;
}

declare module 'json-to-pretty-yaml' {
  function stringify(val: any): string;
}
