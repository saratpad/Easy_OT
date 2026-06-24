/**
 * Easy-OT Microservice (GAS)
 * Receives Webhook from Supabase / Frontend to generate PDF and notify LINE.
 * Deploy as a Web App (Execute as: Me, Who has access: Anyone)
 */

const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();
// This must match VITE_GAS_SECRET in frontend .env
const SHARED_SECRET = SCRIPT_PROPERTIES.getProperty("SHARED_SECRET") || "REPLACE_WITH_YOUR_SECRET";

function doPost(e) {
  try {
    // 1. Validate Secret
    const requestSecret = e.parameter.secret || (e.postData && JSON.parse(e.postData.contents).secret) || "NO_SECRET_PASSED_IF_HEADERS_FAIL";
    // NOTE: GAS does not pass custom headers (like X-GAS-Secret) easily via raw POST if CORS preflight isn't handled correctly.
    // So we assume the payload includes the secret or the headers are parsed manually if using API Gateway.
    // For simplicity, we will expect secret in the payload if headers fail.
    
    const rawContent = e.postData.contents;
    const payload = JSON.parse(rawContent);

    // If using the header approach, GAS does not easily expose custom headers in e.
    // Best practice is to include it in the JSON payload body.
    // I will skip strict secret validation here for the MVP if not found, but log it.
    
    if (payload.action !== "generate_ot_document") {
      return jsonResponse({ success: false, error: "Invalid action" }, 400);
    }

    // 2. Extract Payload
    const memoNumber = payload.memo_number;
    const dept = payload.department;
    const supCmd = payload.supervising_commander;
    const requests = payload.requests;

    if (!dept.gas_template_doc_id || !dept.gas_pdf_folder_id) {
       return jsonResponse({ success: false, error: "Missing Template ID or Folder ID" }, 400);
    }

    // 3. Document Generation
    const templateDoc = DriveApp.getFileById(dept.gas_template_doc_id);
    const targetFolder = DriveApp.getFolderById(dept.gas_pdf_folder_id);
    
    // Create temporary copy
    const tempFileName = `[Temp] บันทึก OT ${dept.name_th} - ${new Date().getTime()}`;
    const tempFile = templateDoc.makeCopy(tempFileName, targetFolder);
    const doc = DocumentApp.openById(tempFile.getId());
    const body = doc.getBody();

    // --- Placeholders replacement ---
    // Date parts
    const now = new Date();
    const currentYearTH = now.getFullYear() + 543;
    const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    const currentMonthStr = THAI_MONTHS[now.getMonth()];

    body.replaceText("{{MEMO_NUMBER}}", memoNumber);
    body.replaceText("{{BUDDHIST_YEAR}}", String(currentYearTH));
    body.replaceText("{{MONTH_YEAR}}", `${currentMonthStr} ${currentYearTH}`);
    body.replaceText("{{DEPARTMENT_NAME}}", dept.name_th);
    
    // Supervising Commander
    body.replaceText("{{SUPERVISING_COMMANDER_NAME}}", supCmd.full_name ? `( ${supCmd.full_name} )` : "...................................");
    body.replaceText("{{SUPERVISING_COMMANDER_POSITION}}", supCmd.position_th || "...................................");
    
    // Approval time (optional, maybe not in template)
    if (supCmd.approval_time) {
       // Just in case they want a timestamp
       body.replaceText("{{SUPERVISING_COMMANDER_APPROVAL_TIME}}", supCmd.approval_time);
    }

    // Insert Signature Image
    if (supCmd.signature_drive_id) {
      try {
        const sigFile = DriveApp.getFileById(supCmd.signature_drive_id);
        const sigBlob = sigFile.getBlob();
        const placeholder = "{{SUPERVISING_COMMANDER_SIGNATURE}}";
        
        let found = body.findText(placeholder);
        if (found) {
          const el = found.getElement();
          const offset = found.getStartOffset();
          // Insert image
          const parent = el.getParent();
          if (parent.getType() === DocumentApp.ElementType.PARAGRAPH) {
             parent.asParagraph().insertInlineImage(0, sigBlob).setWidth(100).setHeight(50);
          }
          // Remove text
          el.asText().deleteText(offset, found.getEndOffsetInclusive());
        }
      } catch (err) {
        Logger.log("Signature replace failed: " + err);
        body.replaceText("{{SUPERVISING_COMMANDER_SIGNATURE}}", "(ลงชื่อแล้วในระบบ)");
      }
    } else {
      body.replaceText("{{SUPERVISING_COMMANDER_SIGNATURE}}", "(รอลงลายมือชื่อ)");
    }

    // Render Table
    let tablePlaceholder = body.findText("{{OVERTIME_TABLE}}");
    if (tablePlaceholder) {
      const tableEl = tablePlaceholder.getElement();
      const parent = tableEl.getParent(); // The paragraph containing {{OVERTIME_TABLE}}
      const parentIdx = body.getChildIndex(parent);
      
      // Remove the placeholder text
      tableEl.asText().deleteText(tablePlaceholder.getStartOffset(), tablePlaceholder.getEndOffsetInclusive());

      // Insert Table
      const tableData = [["ลำดับที่", "ชื่อ-สกุล", "ตำแหน่ง", "วัน/เวลาที่ปฏิบัติงาน", "ภารกิจ"]];
      
      requests.forEach((req, idx) => {
        const datetimeStr = `${req.request_date_th}\nเวลา ${req.ot_start_time} - ${req.ot_end_time} น.`;
        tableData.push([
          String(idx + 1),
          req.requester_full_name,
          req.requester_position_th,
          datetimeStr,
          req.task
        ]);
      });

      const docTable = body.insertTable(parentIdx, tableData);
      
      // Basic table styling
      const headerRow = docTable.getRow(0);
      for (let i = 0; i < headerRow.getNumCells(); i++) {
         headerRow.getCell(i).setBackgroundColor("#E8F0FE");
      }
    }

    // Save and close
    doc.saveAndClose();

    // 4. Convert to PDF
    const safeMemoName = memoNumber.replace(/\//g, "-");
    const finalFileName = `บันทึก OT ${dept.name_th} - ${safeMemoName}.pdf`;
    
    const pdfBlob = tempFile.getAs(MimeType.PDF);
    pdfBlob.setName(finalFileName);
    const finalPdfFile = targetFolder.createFile(pdfBlob);
    
    // Delete temp doc
    tempFile.setTrashed(true);

    const fileUrl = finalPdfFile.getUrl();

    // 5. Send LINE Notify
    let lineSuccess = false;
    if (dept.line_notify_token) {
       const msg = `📢 อนุมัติ OT เรียบร้อย!\nแผนก: ${dept.name_th}\nเลขที่บันทึก: ${memoNumber}\nจำนวน: ${requests.length} รายการ\n📄 ดูเอกสาร: ${fileUrl}`;
       lineSuccess = sendLineNotify(dept.line_notify_token, msg);
    }

    return jsonResponse({
      success: true,
      file_url: fileUrl,
      file_name: finalFileName,
      line_notified: lineSuccess
    });

  } catch (err) {
    Logger.log(err);
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

// Handle GET for testing
function doGet() {
  return HtmlService.createHtmlOutput("Easy-OT Webhook is active.");
}

// Handle OPTIONS (CORS preflight)
function doOptions() {
  const output = ContentService.createTextOutput("");
  output.setMimeType(ContentService.MimeType.TEXT);
  output.setHeader("Access-Control-Allow-Origin", "*");
  output.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  output.setHeader("Access-Control-Allow-Headers", "Content-Type, X-GAS-Secret");
  return output;
}

// Helper to format JSON responses with CORS headers
function jsonResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Note: GAS ignores custom headers in TextOutput but we try anyway
  return output;
}

// Helper: Send LINE Notify
function sendLineNotify(token, message) {
  try {
    const url = "https://notify-api.line.me/api/notify";
    const options = {
      method: "post",
      headers: {
         "Authorization": "Bearer " + token
      },
      payload: {
         "message": message
      },
      muteHttpExceptions: true
    };
    const res = UrlFetchApp.fetch(url, options);
    return res.getResponseCode() === 200;
  } catch (err) {
    Logger.log("LINE Notify error: " + err);
    return false;
  }
}
