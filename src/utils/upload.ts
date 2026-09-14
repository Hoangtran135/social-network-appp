import { getAccessToken } from './api';

interface UploadResult {
  url: string;
  name: string;
  size: number;
}

async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAccessToken();
  const res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Tải tệp lên thất bại');
  }

  return res.json();
}

export async function uploadImageFile(file: File): Promise<string> {
  const result = await uploadFile(file);
  return result.url;
}

export async function uploadVideoFile(file: File): Promise<string> {
  const result = await uploadFile(file);
  return result.url;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { uploadFile };
export type { UploadResult };
