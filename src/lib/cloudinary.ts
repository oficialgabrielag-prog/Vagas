/**
 * Strict Cloudinary Integration for CuneneVagas.
 * Always returns a real Cloudinary HTTPS URL (e.g. https://res.cloudinary.com/...)
 * Powered by @cloudinary/url-gen and @cloudinary/react
 */

import { Cloudinary } from '@cloudinary/url-gen';
import { auto } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';

export const CLOUDINARY_CLOUD_NAME = 
  (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string) || 
  (import.meta.env.CLOUDINARY_CLOUD_NAME as string) || 
  'jbj12sj2';

export const CLOUDINARY_UPLOAD_PRESET = 
  (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string) || 
  (import.meta.env.CLOUDINARY_UPLOAD_PRESET as string) || 
  'empregocunene';

export const CLOUDINARY_API_KEY =
  (import.meta.env.VITE_CLOUDINARY_API_KEY as string) ||
  '436831751518522';

// Cloudinary URL-Gen instance
export const cld = new Cloudinary({
  cloud: {
    cloudName: CLOUDINARY_CLOUD_NAME
  }
});

/**
 * Generate an optimized Cloudinary image object with auto-format and auto-quality
 */
export const getOptimizedImage = (publicIdOrUrl: string, width = 600, height = 600) => {
  if (!publicIdOrUrl) return null;
  
  // If it's already a full URL, extract the publicId if possible or return URL
  let publicId = publicIdOrUrl;
  if (publicIdOrUrl.includes('res.cloudinary.com')) {
    const parts = publicIdOrUrl.split('/upload/');
    if (parts.length > 1) {
      // remove version prefix like v12345/
      publicId = parts[1].replace(/^v\d+\//, '').split('.')[0];
    }
  }

  return cld
    .image(publicId)
    .format('auto')
    .quality('auto')
    .resize(auto().gravity(autoGravity()).width(width).height(height));
};

export const uploadToCloudinary = async (file: File): Promise<string> => {
  // Validate image file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error('Formato de imagem não suportado. Por favor utilize JPG, PNG ou WEBP.');
  }

  // Validate size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('A imagem é demasiado grande. O tamanho máximo é 10MB.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('api_key', CLOUDINARY_API_KEY);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('Cloudinary upload error details:', errData);
    throw new Error('Não foi possível enviar a imagem para o Cloudinary. Tente novamente.');
  }

  const data = await response.json();
  if (!data.secure_url) {
    throw new Error('Resposta inválida do servidor de imagens.');
  }

  return data.secure_url;
};

export const uploadDocumentToCloudinary = async (file: File): Promise<string> => {
  // Validate document file format
  const fileName = (file.name || '').toLowerCase();
  const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
  const isDoc = file.type === 'application/msword' || fileName.endsWith('.doc');
  const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx');

  if (!isPdf && !isDoc && !isDocx) {
    throw new Error('Formato de documento inválido. Por favor envie ficheiros nos formatos PDF, DOC ou DOCX.');
  }

  // Validate size (max 20MB)
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('O ficheiro é demasiado grande. O tamanho máximo é 20MB.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('api_key', CLOUDINARY_API_KEY);

  // Use auto endpoint for documents
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('Cloudinary document upload error details:', errData);
    throw new Error('Não foi possível enviar o documento. Verifique a ligação e tente novamente.');
  }

  const data = await response.json();
  if (!data.secure_url) {
    throw new Error('Resposta inválida do servidor de ficheiros.');
  }

  return data.secure_url;
};
