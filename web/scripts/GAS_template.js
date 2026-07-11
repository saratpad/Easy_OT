// =========================================================================
// Google Apps Script (GAS) Webhook Receiver for Easy OT System
// =========================================================================
// Instructions:
// 1. Create a new Google Apps Script project (script.google.com).
// 2. Paste this code into Code.gs.
// 3. Fill in the placeholders (LINE_NOTIFY_TOKEN, DOC_TEMPLATE_ID, FOLDER_ID).
// 4. Click "Deploy" -> "New deployment" -> Type "Web app".
// 5. Execute as: "Me", Who has access: "Anyone".
// 6. Copy the "Web app URL" and paste it in your Next.js `.env.local` as `GAS_WEBHOOK_URL=...`
// =========================================================================

const LINE_CHANNEL_ACCESS_TOKEN = 'YOUR_LINE_CHANNEL_ACCESS_TOKEN_HERE';
const LINE_TARGET_ID = 'YOUR_LINE_USER_ID_OR_GROUP_ID_HERE'; // The ID to send the message to (starts with U, C, or R)
const DOC_TEMPLATE_ID = 'YOUR_GOOGLE_DOC_TEMPLATE_ID_HERE'; // The ID of the Google Doc template
const PDF_FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE'; // Where to save the generated PDFs
const NEXTJS_API_URL = 'https://YOUR_NEXTJS_DOMAIN/api/gas-webhook'; // If you want GAS to send the PDF URL back

function doPost(e) {
  try {
    // 1. Parse incoming JSON payload from Next.js
    const payload = JSON.parse(e.postData.contents);
    
    if (payload.action === 'generate_pdf') {
      const requestData = payload.data;
      
      // 2. Generate PDF
      const pdfUrl = createPDFFromTemplate(requestData);
      
      // 3. Send LINE Notification
      const message = `\n✅ อนุมัติ OT สำเร็จ!\n` +
                      `ผู้ขอ: ${requestData.user.full_name}\n` +
                      `วันที่: ${requestData.start_time.split('T')[0]}\n` +
                      `จำนวน: ${requestData.total_hours} ชม.\n` +
                      `เอกสาร PDF: ${pdfUrl}`;
      sendLineMessage(message);
      
      // 4. (Optional) Send PDF URL back to Next.js
      // updateNextJsWithPdf(requestData.id, pdfUrl);
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, pdfUrl: pdfUrl }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error(error);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function createPDFFromTemplate(data) {
  // Open template and duplicate it
  const templateDoc = DriveApp.getFileById(DOC_TEMPLATE_ID);
  const folder = DriveApp.getFolderById(PDF_FOLDER_ID);
  const copy = templateDoc.makeCopy(`OT_Request_${data.user.full_name}_${data.start_time.split('T')[0]}`, folder);
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();
  
  // Replace tags in the Google Doc (e.g., {{FULL_NAME}}) with actual data
  body.replaceText('{{FULL_NAME}}', data.user.full_name);
  body.replaceText('{{POSITION}}', data.user.position);
  body.replaceText('{{START_TIME}}', data.start_time);
  body.replaceText('{{END_TIME}}', data.end_time);
  body.replaceText('{{TOTAL_HOURS}}', data.total_hours.toString());
  body.replaceText('{{REASON}}', data.reason);
  
  // Save changes and generate PDF
  doc.saveAndClose();
  const pdfBlob = copy.getAs(MimeType.PDF);
  const pdfFile = folder.createFile(pdfBlob);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Clean up: delete the temporary google doc copy if you only want the PDF
  copy.setTrashed(true);
  
  return pdfFile.getUrl();
}

function sendLineMessage(textMessage) {
  const url = 'https://api.line.me/v2/bot/message/push';
  const payload = {
    to: LINE_TARGET_ID,
    messages: [
      {
        type: 'text',
        text: textMessage
      }
    ]
  };
  
  const options = {
    method: 'post',
    payload: JSON.stringify(payload),
    headers: { 
      'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    }
  };
  
  UrlFetchApp.fetch(url, options);
}
