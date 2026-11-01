const ALLOWED_DATA_URL = /^data:(application\/pdf|image\/png|image\/jpeg|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document);base64,[A-Za-z0-9+/]+={0,2}$/i;

export function getLeaveAttachmentLink(attachment) {
  if (typeof attachment !== 'string' || !attachment) return null;
  if (ALLOWED_DATA_URL.test(attachment)) {
    const mimeType = attachment.slice(5, attachment.indexOf(';')).toLowerCase();
    const extension = mimeType === 'application/pdf'
      ? 'pdf'
      : mimeType === 'image/png'
        ? 'png'
        : mimeType === 'image/jpeg'
          ? 'jpg'
          : 'docx';
    return {
      href: attachment,
      download: `leave-supporting-document.${extension}`,
    };
  }
  if (/^https:\/\/[^\s]+$/i.test(attachment)) {
    return { href: attachment, download: undefined };
  }
  return null;
}
