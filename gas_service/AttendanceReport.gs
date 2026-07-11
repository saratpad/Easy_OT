function generateAttendanceReport(data) {
  try {
    const templateId = data.templateId; // '1ibjusPqv0CGKDIwkZodwyWuOWPwY0R-FihNh9WTv2nM'
    
    // 1. ตรวจสอบโฟลเดอร์สำหรับจัดเก็บ (บัญชีลงเวลา)
    const folder = getOrCreateAttendanceFolder(
      data.divisionName || 'ไม่ระบุกอง', 
      data.fiscalYear || '2569'
    );
    
    const docName = `บัญชีลงเวลา_${data.divisionName || 'ไม่ระบุกอง'}_${data.monthYear || ''}`.replace(/\//g, '_');
    
    const templateFile = DriveApp.getFileById(templateId);
    const newDocFile = templateFile.makeCopy(docName, folder);
    const docId = newDocFile.getId();
    
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();
    
    // ดึง Header มาด้วย เนื่องจาก {{MONTH_YEAR_TH}} และ {{DIVISION_NAME}} อยู่ในส่วนหัว
    const header = doc.getHeader();
    if (header) {
      header.replaceText('{{MONTH_YEAR_TH}}', data.monthYear || '');
      header.replaceText('{{DIVISION_NAME}}', data.divisionName || 'ไม่ระบุกอง');
    }
    
    // เผื่อมีใน Body ด้วย
    body.replaceText('{{MONTH_YEAR_TH}}', data.monthYear || '');
    body.replaceText('{{DIVISION_NAME}}', data.divisionName || 'ไม่ระบุกอง');
    
    // แทนที่ตัวแปรในตาราง
    const employees = data.employees || [];
    
    // ค้นหาตารางแรกในเอกสาร (สมมติว่าเป็นตารางหลัก)
    const tables = body.getTables();
    if (tables.length > 0 && employees.length > 0) {
      const table = tables[0];
      // แถวแรกคือ Header ของตาราง (Index 0)
      // แถวที่ 2 คือ Template Row (Index 1)
      const templateRow = table.getRow(1);
      
      if (templateRow) {
        employees.forEach((emp, index) => {
          const newRow = templateRow.copy();
          newRow.replaceText('{{date}}', emp.date || '');
          newRow.replaceText('{{sequence}}', emp.sequence || String(index + 1));
          newRow.replaceText('{{fullName}}', emp.fullName || '');
          newRow.replaceText('{{timeIn}}', emp.timeIn || '');
          newRow.replaceText('{{timeOut}}', emp.timeOut || '');
          newRow.replaceText('{{reason}}', emp.reason || '');
          table.appendTableRow(newRow);
        });
        
        // ลบแถว Template ทิ้ง
        table.removeRow(1);
      }
    }
    
    // เพิ่มหน้าหมายเหตุกรณีที่มีคน "ไม่ได้ปฏิบัติงาน" หรือ "ถูกปฏิเสธ"
    if (data.remarks && data.remarks.length > 0) {
      body.appendPageBreak();
      
      const headerPara = body.appendParagraph('หมายเหตุบัญชีลงเวลาปฏิบัติงานนอกเวลาราชการ');
      headerPara.setAttributes({
        [DocumentApp.Attribute.FONT_SIZE]: 16,
        [DocumentApp.Attribute.BOLD]: true,
        [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.CENTER
      });
      
      body.appendParagraph('\n'); // เว้นบรรทัด
      
      data.remarks.forEach(remark => {
        body.appendParagraph(remark).setAttributes({
          [DocumentApp.Attribute.FONT_SIZE]: 16,
          [DocumentApp.Attribute.BOLD]: false,
          [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.LEFT
        });
      });
    }
    
    doc.saveAndClose();
    
    let finalFileUrl = '';
    const tempFile = DriveApp.getFileById(docId);
    
    if (data.format === 'pdf') {
      const pdfBlob = tempFile.getAs('application/pdf');
      pdfBlob.setName(docName + '.pdf');
      const pdfFile = folder.createFile(pdfBlob);
      pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      finalFileUrl = pdfFile.getUrl();
      
      tempFile.setTrashed(true);
    } else {
      tempFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      finalFileUrl = tempFile.getUrl();
    }
    
    // 8. ส่ง Callback กลับไปหา Next.js
    if (data.callbackUrl) {
      try {
        UrlFetchApp.fetch(data.callbackUrl, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ 
            success: true, 
            url: finalFileUrl,
            documentId: data.documentId
          }),
          muteHttpExceptions: true
        });
      } catch (cbErr) {
        console.log('Callback failed:', cbErr.message);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      url: finalFileUrl
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
