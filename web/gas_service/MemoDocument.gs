function formatDocName(data) {
  const dateStr = data.thaiDate || 'ไม่ระบุวันที่';
  const docNumber = (data.docNumber || '____').replace(/\//g, '_');
  const division = data.divisionName || 'กนย.';
  return `${dateStr}_OT_${division}_${docNumber}`;
}

function createDuplicateCopy(body) {
  const numElements = body.getNumChildren();
  body.appendPageBreak();
  
  const headerPara = body.appendParagraph('สำเนาคู่ฉบับ');
  headerPara.setAttributes({
    [DocumentApp.Attribute.FOREGROUND_COLOR]: '#0000ff',
    [DocumentApp.Attribute.FONT_SIZE]: 16,
    [DocumentApp.Attribute.BOLD]: true,
    [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.CENTER
  });
  
  for (let i = 0; i < numElements; i++) {
    const originalElement = body.getChild(i);
    const element = originalElement.copy();
    const type = element.getType();
    
    if (type === DocumentApp.ElementType.PARAGRAPH) {
      body.appendParagraph(element);
    } else if (type === DocumentApp.ElementType.TABLE) {
      body.appendTable(element);
    } else if (type === DocumentApp.ElementType.LIST_ITEM) {
      body.appendListItem(element);
    }
  }
}

function insertOvertimeTable(body, employees) {
  const tableText = '{{OVERTIME_TABLE}}';
  const element = body.findText(tableText);
  
  let mergeRequests = [];
  
  if (element) {
    const textElement = element.getElement();
    const parent = textElement.getParent();
    const parentIndex = body.getChildIndex(parent);
    
    parent.removeFromParent();
    
    body.insertParagraph(parentIndex, '<<OT_TABLE>>');
    
    const tableData = [['วัน/เดือน/ปี', 'รายชื่อ/ตำแหน่ง', 'ภารกิจ']];
    
    let currentGroupStartRow = -1;
    let currentGroupRowCount = 0;
    
    employees.forEach((emp, index) => {
      if (emp.date !== '') {
        if (currentGroupRowCount > 1) {
          mergeRequests.push({ startRow: currentGroupStartRow, numRows: currentGroupRowCount });
        }
        currentGroupStartRow = index + 1; // +1 สำหรับแถวหัวตาราง
        currentGroupRowCount = 1;
      } else {
        currentGroupRowCount++;
      }
      tableData.push([
        toThaiNumerals(emp.date),
        toThaiNumerals(emp.namePos),
        toThaiNumerals(emp.task)
      ]);
    });
    
    if (currentGroupRowCount > 1) {
      mergeRequests.push({ startRow: currentGroupStartRow, numRows: currentGroupRowCount });
    }
    
    const table = body.insertTable(parentIndex + 1, tableData);
    
    const tableStyle = {};
    tableStyle[DocumentApp.Attribute.FONT_SIZE] = 16;
    table.setAttributes(tableStyle);
    
    table.setColumnWidth(0, 90); 
    table.setColumnWidth(1, 209); 
    table.setColumnWidth(2, 170); 
    
    const headerRow = table.getRow(0);
    for (let i = 0; i < headerRow.getNumCells(); i++) {
      headerRow.getCell(i).setBackgroundColor('#f3f4f6');
      headerRow.getCell(i).getChild(0).asParagraph().setAttributes({
        [DocumentApp.Attribute.BOLD]: true,
        [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.CENTER
      });
    }

    // ปรับระยะห่างบรรทัดในตารางให้แคบลง (Line Spacing = 1.0) และขีดเส้นใต้หัวข้อกลุ่มวัน
    for (let r = 0; r < table.getNumRows(); r++) {
      const row = table.getRow(r);
      for (let c = 0; c < row.getNumCells(); c++) {
        const cell = row.getCell(c);
        for (let p = 0; p < cell.getNumChildren(); p++) {
          const child = cell.getChild(p);
          if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
            const para = child.asParagraph();
            para.setAttributes({
              [DocumentApp.Attribute.LINE_SPACING]: 1.0,
              [DocumentApp.Attribute.SPACING_AFTER]: 0,
              [DocumentApp.Attribute.SPACING_BEFORE]: 0
            });

            // ค้นหาและขีดเส้นใต้ข้อความ "วันทำการ" และ "วันหยุดราชการ"
            if (c === 0 && r > 0) { // ทำเฉพาะช่องแรกของแถวเนื้อหา
              const text = para.getText();
              const targetTerms = ["วันทำการ", "วันหยุดราชการ"];
              targetTerms.forEach(term => {
                let index = text.indexOf(term);
                if (index !== -1) {
                  para.editAsText().setUnderline(index, index + term.length - 1, true);
                }
              });
            }
          }
        }
      }
    }
  }
  
  return mergeRequests;
}

function insertImageToPlaceholder(body, placeholderText, imageUrl, width) {
  const element = body.findText(placeholderText);
  if (element) {
    const textElement = element.getElement();
    const parent = textElement.getParent();
    textElement.removeFromParent();
    
    try {
      const response = UrlFetchApp.fetch(imageUrl);
      const blob = response.getBlob();
      const inlineImage = parent.asParagraph().insertInlineImage(0, blob);
      const ratio = width / inlineImage.getWidth();
      inlineImage.setWidth(width);
      inlineImage.setHeight(inlineImage.getHeight() * ratio);
    } catch (e) {
      parent.asParagraph().appendText('(ไม่มีรูปลายเซ็น)');
    }
  }
}

function replaceExecutiveStamp(body, data) {
  const stampText = '{{EXECUTIVE_STAMP}}';
  const element = body.findText(stampText);
  if (element) {
    const textElement = element.getElement();
    const parentPara = textElement.getParent().asParagraph();
    const parent = parentPara.getParent();
    let index = parent.getChildIndex(parentPara);
    
    parentPara.clear();
    const paraStyle = { 
      [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.CENTER,
      [DocumentApp.Attribute.LINE_SPACING]: 1.0,
      [DocumentApp.Attribute.SPACING_AFTER]: 0,
      [DocumentApp.Attribute.SPACING_BEFORE]: 0
    };
    parentPara.setAttributes(paraStyle);
    
    const textStyle = {
      [DocumentApp.Attribute.FONT_SIZE]: 16,
      [DocumentApp.Attribute.FOREGROUND_COLOR]: '#0000ff'
    };
    
    // 1. Signature
    if (data.executiveSignatureUrl) {
      try {
        const response = UrlFetchApp.fetch(data.executiveSignatureUrl);
        const blob = response.getBlob();
        const inlineImage = parentPara.appendInlineImage(blob);
        const ratio = 120 / inlineImage.getWidth();
        inlineImage.setWidth(120);
        inlineImage.setHeight(inlineImage.getHeight() * ratio);
      } catch (e) {
        parentPara.appendText('(ลายเซ็น)');
      }
    }
    
    const addLine = (text) => {
      index++;
      const p = parent.insertParagraph(index, text);
      p.setAttributes(paraStyle);
      p.editAsText().setAttributes(textStyle);
      return p;
    };
    
    addLine(`(${data.executiveName || '.......................................'})`);
    addLine(data.executivePosition || '.......................................');
    addLine('ปฏิบัติราชการแทน เลขาธิการนายกรัฐมนตรี');
    
    if (data.executiveApprovedDate) {
      addLine(`วันที่ ${toThaiNumerals(data.executiveApprovedDate)}`);
    } else {
      addLine('วันที่.......................................');
    }
  }
}

function replaceCommanderStamp(body, data) {
  const placeholder = '{{COMMANDER_STAMP}}';
  const element = body.findText(placeholder);
  
  if (element) {
    const textElement = element.getElement();
    const parentPara = textElement.getParent().asParagraph();
    const parent = parentPara.getParent();
    let index = parent.getChildIndex(parentPara);
    
    parentPara.clear();
    const paraStyle = {
      [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.CENTER,
      [DocumentApp.Attribute.LINE_SPACING]: 1.0,
      [DocumentApp.Attribute.SPACING_AFTER]: 0,
      [DocumentApp.Attribute.SPACING_BEFORE]: 0
    };
    parentPara.setAttributes(paraStyle);
    
    const textStyle = {
      [DocumentApp.Attribute.FONT_SIZE]: 16,
      [DocumentApp.Attribute.FOREGROUND_COLOR]: '#000000'
    };
    
    parentPara.setAttributes({
      [DocumentApp.Attribute.LINE_SPACING]: 1.0,
      [DocumentApp.Attribute.SPACING_AFTER]: 0,
      [DocumentApp.Attribute.SPACING_BEFORE]: 0
    });
    
    if (data.commanderSignatureUrl) {
      try {
        const response = UrlFetchApp.fetch(data.commanderSignatureUrl);
        const blob = response.getBlob();
        const inlineImage = parentPara.appendInlineImage(blob);
        const ratio = 150 / inlineImage.getWidth();
        inlineImage.setWidth(150);
        inlineImage.setHeight(inlineImage.getHeight() * ratio);
        parentPara.appendText('\n'); 
      } catch (e) {
        parentPara.appendText('\n(ลายเซ็น)\n');
      }
    } else {
      parentPara.appendText('\n\n\n');
    }
    
    const detailText = parentPara.appendText(`(${data.commanderName})\n${data.commanderPosition}`);
    detailText.setAttributes(textStyle);
  }
}

function mergeTableCellsViaAPI(docId, mergeRequests) {
  const token = ScriptApp.getOAuthToken();
  const url = `https://docs.googleapis.com/v1/documents/${docId}`;
  
  // ดึงโครงสร้างเอกสาร
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: `Bearer ${token}` },
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    console.log('Get Doc Error:', response.getContentText());
    return;
  }
  
  const docJson = JSON.parse(response.getContentText());
  const content = docJson.body.content;
  
  // หาตำแหน่ง startIndex ของตาราง OT โดยดูจาก Marker <<OT_TABLE>> ที่อยู่ก่อนหน้า
  let tableStartIndex = null;
  for (let i = 0; i < content.length; i++) {
    const el = content[i];
    if (el.paragraph && el.paragraph.elements) {
      const text = el.paragraph.elements.map(e => e.textRun ? e.textRun.content : '').join('');
      if (text.includes('<<OT_TABLE>>')) {
        // ตารางจะอยู่ถัดจาก marker
        for (let j = i + 1; j < content.length; j++) {
          if (content[j].table) {
            tableStartIndex = content[j].startIndex;
            console.log('Found OT table at startIndex:', tableStartIndex, 'rows:', content[j].table.rows);
            break;
          }
        }
        break;
      }
    }
  }
  
  if (tableStartIndex === null) {
    console.log('ไม่พบตาราง OT ในเอกสาร');
    return;
  }
  
  const updateUrl = `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`;
  
  // Merge ทีละ request เพื่อป้องกัน index เพี้ยน
  // ต้องเริ่มจาก column ขวาสุด (col 2) ก่อน แล้วค่อย col 0
  // และเริ่มจากแถวล่างสุดก่อน เพื่อไม่ให้ merge ด้านบนไปเปลี่ยน index ด้านล่าง
  const sortedRequests = mergeRequests.slice().sort((a, b) => b.startRow - a.startRow);
  
  // Merge Column 2 (ภารกิจ) ก่อน
  for (const req of sortedRequests) {
    const mergeReq = {
      requests: [{
        mergeTableCells: {
          tableRange: {
            tableCellLocation: {
              tableStartLocation: { index: tableStartIndex },
              rowIndex: req.startRow,
              columnIndex: 2
            },
            rowSpan: req.numRows,
            columnSpan: 1
          }
        }
      }]
    };
    const res = UrlFetchApp.fetch(updateUrl, {
      method: 'post',
      headers: { Authorization: `Bearer ${token}` },
      contentType: 'application/json',
      payload: JSON.stringify(mergeReq),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) {
      console.log('Merge Col2 Error (row ' + req.startRow + '):', res.getContentText());
    }
  }
  
  // Merge Column 0 (วัน/เดือน/ปี) ทีหลัง
  for (const req of sortedRequests) {
    const mergeReq = {
      requests: [{
        mergeTableCells: {
          tableRange: {
            tableCellLocation: {
              tableStartLocation: { index: tableStartIndex },
              rowIndex: req.startRow,
              columnIndex: 0
            },
            rowSpan: req.numRows,
            columnSpan: 1
          }
        }
      }]
    };
    const res = UrlFetchApp.fetch(updateUrl, {
      method: 'post',
      headers: { Authorization: `Bearer ${token}` },
      contentType: 'application/json',
      payload: JSON.stringify(mergeReq),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) {
      console.log('Merge Col0 Error (row ' + req.startRow + '):', res.getContentText());
    }
  }
}
