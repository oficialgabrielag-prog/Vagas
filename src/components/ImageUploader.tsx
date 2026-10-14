import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Loader2, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { uploadToCloudinary } from '../lib/cloudinary';

export type ImageUploaderContext = 
  | 'candidate-avatar'
  | 'company-logo'
  | 'company-cover'
  | 'product-image'
  | 'community-post';

interface ImageUploaderProps {
  context: ImageUploaderContext;
  currentImageUrl?: string;
  onUploadSuccess: (url: string) => void;
  onRemove?: () => void;
  label?: string;
  aspectRatio?: 'square' | 'cover' | 'auto';
  className?: string;
  disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  context,
  currentImageUrl,
  onUploadSuccess,
  onRemove,
  label,
  aspectRatio = 'square',
  className = '',
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayImage = previewUrl || currentImageUrl;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate format
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setErrorMsg('Formato de imagem não suportado. Escolha um ficheiro JPG, PNG ou WEBP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Tamanho excessivo. O limite máximo para imagens é 10MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);

    try {
      // Ler o ficheiro como Base64 Data URL para garantir salvamento imediato e infalível
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Result = uploadEvent.target?.result as string;
        if (base64Result) {
          setPreviewUrl(base64Result);
          onUploadSuccess(base64Result);
          setSuccessMsg('Fotografia carregada com sucesso!');
          setTimeout(() => setSuccessMsg(null), 3000);
        }
        setUploading(false);
      };
      reader.onerror = () => {
        throw new Error('Erro ao ler o ficheiro de imagem.');
      };
      reader.readAsDataURL(file);

    } catch (err: any) {
      setUploading(false);
      setErrorMsg(err.message || 'Não foi possível carregar a imagem. Tente novamente.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTriggerClick = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (onRemove) onRemove();
  };

  // Render variant based on context
  if (context === 'candidate-avatar' || context === 'company-logo') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        {label && <label className="text-xs font-bold text-slate-700">{label}</label>}
        
        <div className="relative group cursor-pointer" onClick={handleTriggerClick}>
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center shadow-xs transition group-hover:border-[#0F4C9C]">
            {displayImage ? (
              <img src={displayImage} alt="Avatar/Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="text-slate-400 flex flex-col items-center gap-1">
                <Camera className="w-7 h-7" />
                <span className="text-[10px] font-semibold">Adicionar</span>
              </div>
            )}

            {uploading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs rounded-full flex flex-col items-center justify-center text-white gap-1 animate-fadeIn">
                <Loader2 className="w-6 h-6 animate-spin text-[#FFC20E]" />
                <span className="text-[10px] font-bold">Enviando...</span>
              </div>
            )}
          </div>

          {!uploading && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleTriggerClick();
              }}
              className="absolute bottom-0 right-0 p-2 bg-[#0F4C9C] text-white rounded-full shadow-md group-hover:bg-[#0c3c7d] hover:scale-110 active:scale-95 transition cursor-pointer z-10"
              title={displayImage ? 'Alterar imagem' : 'Adicionar imagem'}
            >
              <Camera className="w-3.5 h-3.5" />
            </div>
          )}

          {displayImage && !uploading && onRemove && (
            <button
              type="button"
              onClick={handleRemoveClick}
              className="absolute top-0 right-0 p-1.5 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 transition"
              title="Remover imagem"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Text Action Indicator: Adicionar vs Alterar */}
        <button
          type="button"
          onClick={handleTriggerClick}
          disabled={disabled || uploading}
          className="text-xs font-bold text-[#0F4C9C] hover:underline"
        >
          {displayImage ? (context === 'company-logo' ? 'Alterar Logótipo' : 'Alterar Fotografia') : (context === 'company-logo' ? 'Adicionar Logótipo' : 'Adicionar Fotografia')}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        {errorMsg && (
          <div className="text-[11px] text-rose-600 font-medium flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 animate-fadeIn">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>
    );
  }

  if (context === 'company-cover') {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && <label className="text-xs font-bold text-slate-700 block">{label}</label>}

        <div
          onClick={handleTriggerClick}
          className="relative w-full h-36 sm:h-44 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#0F4C9C] bg-slate-100 overflow-hidden cursor-pointer transition flex items-center justify-center group"
        >
          {displayImage ? (
            <>
              <img src={displayImage} alt="Capa" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-2">
                <Camera className="w-5 h-5" />
                <span className="text-xs font-bold">Alterar Capa</span>
              </div>
            </>
          ) : (
            <div className="text-center p-4 space-y-1">
              <Upload className="w-6 h-6 text-slate-400 mx-auto" />
              <span className="text-xs font-bold text-slate-600 block">Clique para carregar capa empresarial</span>
              <span className="text-[10px] text-slate-400 block">JPG, PNG ou WEBP (Max 10MB)</span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-[#FFC20E]" />
              <span className="text-xs font-bold">Enviando imagem para a nuvem...</span>
            </div>
          )}

          {displayImage && !uploading && onRemove && (
            <button
              type="button"
              onClick={handleRemoveClick}
              className="absolute top-3 right-3 p-2 bg-rose-600 text-white rounded-xl shadow-md hover:bg-rose-700 transition"
              title="Remover capa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        {errorMsg && (
          <div className="text-xs text-rose-600 font-medium flex items-center gap-1.5 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    );
  }

  // Standard compact variant for product-image and community-post
  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-xs font-bold text-slate-700 block">{label}</label>}

      {displayImage ? (
        <div className="relative w-full h-24 rounded-2xl overflow-hidden bg-slate-100 group border border-slate-200">
          <img src={displayImage} alt="Anexo" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-2">
            <button
              type="button"
              onClick={handleTriggerClick}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Alterar</span>
            </button>
            {onRemove && !uploading && (
              <button
                type="button"
                onClick={handleRemoveClick}
                className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleTriggerClick}
          disabled={disabled || uploading}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-[#0F4C9C] bg-slate-50/50 hover:bg-blue-50/30 text-slate-600 hover:text-[#0F4C9C] transition flex items-center justify-center gap-2 text-xs font-bold"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#0F4C9C]" />
              <span>A carregar fotografia...</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4 text-[#0F4C9C]" />
              <span>Adicionar Fotografia</span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {errorMsg && (
        <div className="text-xs text-rose-600 font-medium flex items-center gap-1.5 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
