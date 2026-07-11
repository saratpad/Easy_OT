function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 0.5 จัดการคำสั่งสร้างรายงานบัญชีลงเวลา
    if (data.action === 'generate_attendance_report') {
      return generateAttendanceReport(data);
    }
    
    // 0. จัดการคำสั่งลบไฟล์
    if (data.action === 'delete_file' && data.fileId) {
      try {
        const file = DriveApp.getFileById(data.fileId);
        file.setTrashed(true);
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'File deleted' }))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // 0.7 ตัดยอดประจำปี (Archive & Clear Folders)
    if (data.action === 'archive_folders') {
      try {
        const folderIds = [
          "1OZQITjAMAbPDNLIC4QEKBVDS6GAOBhG4",
          "1mgEj2uPGcJd9olWRc8F0GUule6gddm2K"
        ];
        
        function getAllBlobs(f, arr) {
          const files = f.getFiles();
          while (files.hasNext()) {
            const file = files.next();
            try {
              if (file.getMimeType() === MimeType.GOOGLE_DOCS || file.getMimeType() === MimeType.GOOGLE_SHEETS) {
                arr.push(file.getAs('application/pdf'));
              } else {
                arr.push(file.getBlob());
              }
            } catch(e) { /* ignore files that can't be zipped */ }
          }
          const subFolders = f.getFolders();
          while (subFolders.hasNext()) {
            getAllBlobs(subFolders.next(), arr);
          }
        }
        
        function trashAll(f) {
          const files = f.getFiles();
          while (files.hasNext()) {
            files.next().setTrashed(true);
          }
          const subFolders = f.getFolders();
          while (subFolders.hasNext()) {
            const sub = subFolders.next();
            trashAll(sub);
            sub.setTrashed(true);
          }
        }

        const blobs = [];
        for (let i = 0; i < folderIds.length; i++) {
          const folder = DriveApp.getFolderById(folderIds[i]);
          getAllBlobs(folder, blobs);
        }
        
        let zipUrl = "";
        let zipFileId = "";
        if (blobs.length > 0) {
          const zipBlob = Utilities.zip(blobs, "Annual_OT_Archive_" + new Date().getFullYear() + ".zip");
          const zipFile = DriveApp.createFile(zipBlob);
          zipFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          zipUrl = zipFile.getDownloadUrl();
          zipFileId = zipFile.getId();
        }
        
        for (let j = 0; j < folderIds.length; j++) {
          const folder = DriveApp.getFolderById(folderIds[j]);
          trashAll(folder);
        }
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          message: "Folders archived and cleared",
          url: zipUrl,
          fileId: zipFileId
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    const templateId = data.templateId || TEMPLATE_DOC_ID;
    
    // 1. ตรวจสอบโฟลเดอร์สำหรับจัดเก็บ
    const folder = getOrCreateDivisionFolder(
      data.divisionName || 'ไม่ระบุกอง', 
      data.divisionFolderId,
      data.fiscalYear || '2569'
    );
    
    // 2. ตั้งชื่อไฟล์ตามเดือนและเลขที่ กนย.
    const docName = formatDocName(data);
    
    // 3. สร้างสำเนาจาก Template
    const templateFile = DriveApp.getFileById(templateId);
    const newDocFile = templateFile.makeCopy(docName, folder);
    const docId = newDocFile.getId();
    
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();
    
    // แทนที่ข้อความทั่วไป
    body.replaceText('{{DOC_NUMBER}}', data.docNumber || '...................');
    body.replaceText('{{THAI_DATE}}', data.thaiDate ? toThaiNumerals(data.thaiDate) : '..........................................................');
    body.replaceText('{{FISCAL_YEAR}}', data.fiscalYear ? toThaiNumerals(data.fiscalYear) : '...................');
    body.replaceText('{{BUDDHIST_YEAR}}', data.buddhistYear ? toThaiNumerals(data.buddhistYear) : '...................');
    
    body.replaceText('{{COMMANDER_NAME}}', data.commanderName || '');
    body.replaceText('{{COMMANDER_POSITION}}', data.commanderPosition || '');
    
    // 4. แทรกส่วนของ ผอ.กอง (รวมลายเซ็น ชื่อ ตำแหน่ง และจัดกึ่งกลาง) ลงใน {{COMMANDER_STAMP}}
    if (data.commanderName) {
      replaceCommanderStamp(body, data);
    } else {
      body.replaceText('{{COMMANDER_STAMP}}', '');
    }
    
    // 5. แทรกตารางรายชื่อ OT
    const mergeRequests = insertOvertimeTable(body, data.employees);
    
    // 6. ประทับตรา Executive ลงใน {{EXECUTIVE_STAMP}}
    if (data.executiveName) {
      replaceExecutiveStamp(body, data);
    } else {
      body.replaceText('{{EXECUTIVE_STAMP}}', '');
    }
    
    // 6.5 สร้างสำเนาคู่ฉบับ (ปิดใช้งานตามคำขอ)
    // createDuplicateCopy(body);
    
    // บันทึกการเปลี่ยนแปลงของเอกสาร Docs เพื่อให้ REST API เห็นโครงสร้างล่าสุด
    doc.saveAndClose();
    
    // 6.7 ทำการ Merge Cells แนวตั้งผ่าน REST API
    try {
      if (mergeRequests && mergeRequests.length > 0) {
        mergeTableCellsViaAPI(docId, mergeRequests);
      }
    } catch (mergeErr) {
      console.log('Merge Error:', mergeErr.message || mergeErr);
    }
    
    // 6.8 ลบ Marker <<OT_TABLE>> ทิ้ง
    const doc2 = DocumentApp.openById(docId);
    let marker = doc2.getBody().findText('<<OT_TABLE>>');
    while (marker) {
      marker.getElement().getParent().removeFromParent();
      marker = doc2.getBody().findText('<<OT_TABLE>>');
    }
    doc2.saveAndClose();
    
    // 7. Export ไฟล์เป็น PDF (หรือคงไว้เป็น DOCX/Google Docs)
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
    
    // 8. ส่ง Callback กลับไปหา Next.js (optional - ล้มเหลวได้ไม่กระทบ)
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
        console.log('Callback failed (ไม่กระทบการสร้างเอกสาร):', cbErr.message);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      url: finalFileUrl,
      folderId: folder.getId()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
