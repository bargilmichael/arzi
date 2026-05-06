
import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Language, translations } from '../translations';
import { translateToHebrew } from '../services/aiService';
import { storage } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

interface Props {
  lang: Language;
  unitId: string; // Add unitId to props
  onClose: () => void;
  onConfirm: (data: {
    workerName: string;
    originalDescription: string;
    translatedDescription: string;
    signatureUrl: string;
    language: 'ru' | 'ar';
  }) => void;
}

const WorkConfirmationModal: React.FC<Props> = ({ lang, unitId, onClose, onConfirm }) => {
  const t = translations[lang];
  const [workerName, setWorkerName] = useState('');
  const [description, setDescription] = useState('');
  const [translatedDescription, setTranslatedDescription] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [workLang, setWorkLang] = useState<'ru' | 'ar'>(lang === 'ar' ? 'ar' : 'ru');
  
  const sigCanvas = useRef<SignatureCanvas>(null);

  const handleTranslate = async () => {
    if (!description.trim()) return;
    setIsTranslating(true);
    const result = await translateToHebrew(description, workLang);
    setTranslatedDescription(result);
    setIsTranslating(false);
  };

  const handleClearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = async () => {
    if (!workerName || !description || sigCanvas.current?.isEmpty()) {
      alert("Please fill all fields and sign");
      return;
    }
    
    setIsSaving(true);
    try {
      const signatureDataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png') || '';
      
      // Upload to Storage
      const signatureRef = ref(storage, `signatures/${unitId}_${Date.now()}.png`);
      await uploadString(signatureRef, signatureDataUrl, 'data_url');
      const signatureUrl = await getDownloadURL(signatureRef);
      
      onConfirm({
        workerName,
        originalDescription: description,
        translatedDescription: translatedDescription || description,
        signatureUrl,
        language: workLang
      });
    } catch (error) {
      console.error("Error saving signature:", error);
      alert("Failed to save signature. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-blue-900/40 backdrop-blur-xl">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
          <h3 className="text-2xl font-black text-blue-900">🖋️ {t.workConfirmationTitle}</h3>
          <button onClick={onClose} className="text-3xl text-gray-400 hover:text-red-500 transition-colors">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Language Selection */}
          <div className="flex gap-2">
            <button 
              onClick={() => setWorkLang('ru')} 
              className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all border-2 ${workLang === 'ru' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-gray-400 border-slate-100'}`}
            >
              Русский
            </button>
            <button 
              onClick={() => setWorkLang('ar')} 
              className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all border-2 ${workLang === 'ar' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-gray-400 border-slate-100'}`}
            >
              العربية
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t.workerNameField}</label>
            <input 
              value={workerName}
              onChange={e => setWorkerName(e.target.value)}
              placeholder={t.workerNamePlaceholder}
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold bg-slate-50/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t.descriptionInLang}</label>
            <div className="relative">
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="..."
                className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold bg-slate-50/50 resize-none"
              />
              <button 
                onClick={handleTranslate}
                disabled={isTranslating || !description}
                className="absolute bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isTranslating ? (
                   <span className="animate-spin text-sm">⏳</span>
                ) : (
                   <span>🌐</span>
                )}
                {t.translateToHebrew}
              </button>
            </div>
          </div>

          {translatedDescription && (
            <div className="space-y-2 animate-in slide-in-from-top-4">
              <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-1">{t.translatedDescriptionLabel}</label>
              <div className="w-full px-6 py-4 rounded-2xl border-2 border-blue-100 bg-blue-50/30 font-bold text-blue-900 leading-relaxed">
                {translatedDescription}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.signaturePadLabel}</label>
              <button onClick={handleClearSignature} className="text-[10px] font-black text-red-500 uppercase tracking-tighter hover:underline">{t.clearSignature}</button>
            </div>
            <div className="bg-slate-100 rounded-3xl border-2 border-slate-200 overflow-hidden h-48">
              <SignatureCanvas 
                ref={sigCanvas}
                penColor="black"
                canvasProps={{ className: 'w-full h-full' }}
              />
            </div>
          </div>
        </div>

        <div className="p-8 border-t bg-slate-50">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSaving ? "⏳ ..." : `✅ ${t.confirmAndSave}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkConfirmationModal;
