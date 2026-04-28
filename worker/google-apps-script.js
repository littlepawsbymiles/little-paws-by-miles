/**
 * Little Paws By Miles — Google Sheets Form Logger
 *
 * Deploy this as a Google Apps Script Web App, then paste the resulting
 * URL into the Cloudflare Worker's GOOGLE_SHEETS_WEBHOOK secret.
 *
 * Setup steps:
 *   1. Open Google Sheets → create a new spreadsheet titled
 *      "Little Paws Enquiries"
 *   2. Add a sheet tab called "Submissions"
 *   3. Add this header row in row 1, columns A–K:
 *        Submitted At | Form Type | Name | Email | Phone | Breed |
 *        Queen Registration | Health Tested | Timeframe | Message | Page
 *   4. Extensions → Apps Script
 *   5. Replace any existing code with this file's contents
 *   6. Save (Cmd/Ctrl+S), give the script a name
 *   7. Click "Deploy" → "New deployment"
 *      - Type: Web app
 *      - Description: Form logger
 *      - Execute as: Me
 *      - Who has access: Anyone (this is fine — the Worker validates first)
 *   8. Click Deploy. Authorise when prompted.
 *   9. COPY the Web App URL — it looks like:
 *        https://script.google.com/macros/s/AKfyc.../exec
 *  10. Paste that URL into the Cloudflare Worker's GOOGLE_SHEETS_WEBHOOK secret.
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Open the sheet — adjust the tab name if you used a different one
    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName('Submissions');

    if (!sheet) {
      return jsonOutput({ error: 'Sheet "Submissions" not found' }, 500);
    }

    // Append the row in the same column order as the headers
    sheet.appendRow([
      data.submittedAt || new Date().toISOString(),
      data.formType || '',
      data.name || '',
      data.email || '',
      data.phone || '',
      data.breed || '',
      data.queenRegistration || '',
      data.healthTested || '',
      data.timeframe || '',
      data.message || '',
      data.pageUrl || ''
    ]);

    return jsonOutput({ ok: true }, 200);
  } catch (err) {
    return jsonOutput({ error: err.toString() }, 500);
  }
}

function doGet() {
  return jsonOutput({ ok: true, message: 'Webhook is alive. Use POST to log submissions.' }, 200);
}

function jsonOutput(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
