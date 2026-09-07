export function sanitizeFileName(value) {
  const text = String(value ?? '').trim() || 'File';
  const normalized = text
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || 'File';
}

export function getFileTypeLabel(name = '') {
  const fileName = sanitizeFileName(name || '').toLowerCase();
  if (fileName.endsWith('.pdf')) return 'PDF';
  const ext = fileName.includes('.') ? fileName.split('.').pop() : '';
  return ext ? ext.toUpperCase() : 'FILE';
}

export function buildFileAttachmentCard({ name, href, size = '' }) {
  const safeName = sanitizeFileName(name);
  const safeHref = String(href || '').trim();
  const safeSize = String(size || '').replace(/[\r\n"]/g, '').trim();
  const isPdf = safeName.toLowerCase().endsWith('.pdf');
  const label = getFileTypeLabel(safeName);
  const sizeMarkup = safeSize ? `<span class="file-attachment-size">${safeSize}</span>` : '';

  return `
    <div class="file-attachment-card" data-file-name="${safeName}">
      <div class="file-attachment-main">
        <div class="file-attachment-icon ${isPdf ? 'is-pdf' : ''}" aria-hidden="true">${isPdf ? 'PDF' : label.slice(0, 3)}</div>
        <div class="file-attachment-copy">
          <div class="file-attachment-name">${safeName}</div>
          ${sizeMarkup}
        </div>
      </div>
      <div class="file-attachment-actions">
        <a class="file-attachment-action file-attachment-open" href="${safeHref}" target="_blank" rel="noopener noreferrer">Open</a>
        <a class="file-attachment-action file-attachment-download" href="${safeHref}" download="${safeName}">Download</a>
        <button type="button" class="file-attachment-action file-attachment-share" data-file-url="${safeHref}" data-file-name="${safeName}">Share</button>
      </div>
    </div>
  `;
}

export function serializeFileLink({ name, href, size = '' }) {
  const safeName = sanitizeFileName(name);
  const safeHref = String(href || '').trim();
  const safeSize = String(size || '').replace(/[\r\n"]/g, '').trim();

  return safeHref
    ? `[${safeName}](${safeHref}${safeSize ? ` "${safeSize}"` : ''})`
    : `[${safeName}]()`;
}
