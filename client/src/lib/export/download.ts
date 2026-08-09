// Trigger a browser download of generated text.
//
// Replaces the server's `Content-Disposition: attachment` response: with the ledger held in
// the browser there is nothing to fetch, so the file is built in memory and handed to the
// download machinery directly.

export function downloadText(filename: string, text: string, mimeType = 'text/plain'): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mimeType};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  // Firefox needs the anchor in the document for a programmatic click to register.
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoking immediately can cancel the download in some browsers; defer past the click.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
