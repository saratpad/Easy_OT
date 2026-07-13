const DRIVE_ROOT_FOLDER_ID = '1mgEj2uPGcJd9olWRc8F0GUule6gddm2K';
const TEMPLATE_DOC_ID = '1UEZG7RjyaAOqoF3ynGfmQGyZacxdv23LIZxAeK7fzik';

function getMonthName(dateString) {
  if (!dateString) return 'ไม่ระบุเดือน';
  const parts = dateString.split(' ');
  if (parts.length >= 2) return parts[1];
  return 'ไม่ระบุเดือน';
}

function getOrCreateDivisionFolder(divisionName, existingFolderId, fiscalYear) {
  const root = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
  
  let divFolder;
  if (existingFolderId) {
    try {
      const tempFolder = DriveApp.getFolderById(existingFolderId);
      if (!tempFolder.isTrashed()) {
        divFolder = tempFolder;
      }
    } catch (e) {}
  }
  
  if (!divFolder) {
    const existing = root.searchFolders(`title = '${divisionName}' and trashed = false`);
    divFolder = existing.hasNext() ? existing.next() : root.createFolder(divisionName);
  }
  
  const yearFolders = divFolder.searchFolders(`title = '${fiscalYear}' and trashed = false`);
  return yearFolders.hasNext() ? yearFolders.next() : divFolder.createFolder(fiscalYear);
}

function getOrCreateAttendanceFolder(divisionName, fiscalYear) {
  const root = DriveApp.getFolderById('1OZQITjAMAbPDNLIC4QEKBVDS6GAOBhG4');
  
  const existing = root.searchFolders(`title = '${divisionName}' and trashed = false`);
  const divFolder = existing.hasNext() ? existing.next() : root.createFolder(divisionName);
  
  const yearFolders = divFolder.searchFolders(`title = '${fiscalYear}' and trashed = false`);
  return yearFolders.hasNext() ? yearFolders.next() : divFolder.createFolder(fiscalYear);
}


function toThaiNumerals(text) {
  if (!text) return text;
  const thaiNums = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return text.replace(/[0-9]/g, match => thaiNums[parseInt(match, 10)]);
}

function applyOfficialFont(doc) {
  try {
    const style = {};
    style[DocumentApp.Attribute.FONT_FAMILY] = 'TH Sarabun PSK';
    
    const body = doc.getBody();
    if (body) {
      body.setAttributes(style);
    }
    
    const header = doc.getHeader();
    if (header) {
      header.setAttributes(style);
    }
    
    const footer = doc.getFooter();
    if (footer) {
      footer.setAttributes(style);
    }
  } catch (e) {
    console.log('Error applying official font style:', e.message);
  }
}
