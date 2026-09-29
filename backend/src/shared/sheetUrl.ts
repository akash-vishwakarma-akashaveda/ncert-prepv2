/** Turns a Google Sheets share/edit link into its CSV export URL. Accepts an export link unchanged. */
export function toCsvExportUrl(input: string): string {
  const url = input.trim();
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) throw new Error('Not a Google Sheets link — paste the URL from your browser\'s address bar.');
  const gidMatch = url.match(/[?&#]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;
}

/** Fetches the sheet as CSV text. Throws with a message safe to show the admin. */
export async function fetchSheetCsv(sheetUrl: string): Promise<string> {
  const csvUrl = toCsvExportUrl(sheetUrl);
  const res = await fetch(csvUrl, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? 'Could not read this sheet — set sharing to "Anyone with the link can view" and try again.'
        : `Could not fetch the sheet (HTTP ${res.status}).`
    );
  }
  const text = await res.text();
  if (text.trimStart().startsWith('<')) {
    throw new Error('Could not read this sheet — set sharing to "Anyone with the link can view" and try again.');
  }
  return text;
}
