
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  PhotoIcon,
  ClipboardDocumentCheckIcon,
  XMarkIcon,
  EyeIcon,
  NoSymbolIcon,
  FireIcon,
  CommandLineIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  PaintBrushIcon,
  DocumentArrowDownIcon,
  ArchiveBoxIcon,
  MoonIcon,
  SunIcon,
  BuildingOfficeIcon,
  TreeLeafIcon
} from '@heroicons/react/24/outline';
import { ImageFile } from './types';

declare const jspdf: any;
declare const JSZip: any;
declare const saveAs: any;

type PixelTheme = 'none' | 'midnight' | 'sunrise' | 'forest' | 'town';

const THEME_OVERLAYS: Record<PixelTheme, React.ReactNode> = {
  none: null,
  midnight: (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-10 right-10 w-20 h-20 bg-yellow-100 rounded-full shadow-[0_0_40px_rgba(255,255,200,0.5)]" />
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white animate-pulse" />
      <div className="absolute top-1/2 left-1/3 w-1 h-1 bg-white animate-pulse delay-75" />
      <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-white animate-pulse delay-150" />
    </div>
  ),
  sunrise: (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-400 rounded-full shadow-[0_0_100px_rgba(255,100,0,0.5)]" />
      <div className="absolute bottom-0 w-full h-24 bg-orange-800/20" />
    </div>
  ),
  forest: (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-end justify-around">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="w-0 h-0 border-l-[30px] border-l-transparent border-r-[30px] border-r-transparent border-bottom-[60px] border-b-green-900 mb-[-10px] opacity-40" 
             style={{ borderBottomWidth: '80px' }} />
      ))}
    </div>
  ),
  town: (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-end">
      <div className="w-full flex items-end gap-1 px-4">
        <div className="w-12 h-32 bg-slate-900/40" />
        <div className="w-16 h-48 bg-slate-900/60" />
        <div className="w-14 h-40 bg-slate-900/40" />
        <div className="w-20 h-56 bg-slate-900/60" />
        <div className="w-12 h-36 bg-slate-900/40" />
      </div>
    </div>
  )
};

export default function App() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isExportingBase64, setIsExportingBase64] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingZIP, setIsExportingZIP] = useState(false);
  const [base64Output, setBase64Output] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activePixelTheme, setActivePixelTheme] = useState<PixelTheme>('none');
  const [bgCustomColor, setBgCustomColor] = useState('#f8fafc');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImage: ImageFile = {
        id: Math.random().toString(36).substr(2, 9),
        url: e.target?.result as string,
        name: file.name,
        type: file.type,
        size: file.size
      };
      setImages(prev => [...prev, newImage]);
    };
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) processFile(blob);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFile]);

  const generatePDF = async () => {
    if (images.length === 0) return null;
    const pdf = new jspdf.jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < images.length; i++) {
      if (i > 0) pdf.addPage();
      const img = images[i];
      const imgElement = new Image();
      imgElement.src = img.url;
      await new Promise((resolve) => { imgElement.onload = resolve; });
      const ratio = imgElement.width / imgElement.height;
      let targetWidth = pageWidth - 40;
      let targetHeight = targetWidth / ratio;
      if (targetHeight > pageHeight - 40) {
        targetHeight = pageHeight - 40;
        targetWidth = targetHeight * ratio;
      }
      const x = (pageWidth - targetWidth) / 2;
      const y = (pageHeight - targetHeight) / 2;
      pdf.addImage(img.url, 'JPEG', x, y, targetWidth, targetHeight, undefined, 'FAST');
    }
    return pdf;
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const pdf = await generatePDF();
      if (pdf) {
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (err) { console.error(err); } 
    finally { setIsPreviewing(false); }
  };

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    try {
      const pdf = await generatePDF();
      if (pdf) pdf.save('snapbind-retro.pdf');
    } catch (err) { console.error(err); } 
    finally { setIsExportingPDF(false); }
  };

  const handleDownloadZIP = async () => {
    setIsExportingZIP(true);
    try {
      const zip = new JSZip();
      images.forEach((img, index) => {
        const base64Data = img.url.split(',')[1];
        const extension = img.type.split('/')[1] || 'png';
        zip.file(`image-${index + 1}.${extension}`, base64Data, { base64: true });
      });
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'snapbind-images.zip');
    } catch (err) { console.error(err); } 
    finally { setIsExportingZIP(false); }
  };

  const handleBase64Export = async () => {
    setIsExportingBase64(true);
    try {
      const pdf = await generatePDF();
      if (pdf) {
        const b64 = pdf.output('datauristring').split(',')[1];
        setBase64Output(b64);
      }
    } catch (err) { console.error(err); } 
    finally { setIsExportingBase64(false); }
  };

  const copyToClipboard = () => {
    if (base64Output) {
      navigator.clipboard.writeText(base64Output);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const isDark = activePixelTheme === 'midnight' || activePixelTheme === 'town' || (bgCustomColor !== '#f8fafc' && bgCustomColor < '#888888');

  return (
    <div 
      className={`min-h-screen transition-all duration-700 relative ${activePixelTheme !== 'none' ? `bg-pixel-${activePixelTheme}` : ''}`}
      style={activePixelTheme === 'none' ? { backgroundColor: bgCustomColor } : {}}
    >
      {THEME_OVERLAYS[activePixelTheme]}

      <div className={`relative z-10 max-w-5xl mx-auto px-6 py-12 ${isDark ? 'text-white' : 'text-black'}`}>
        <header className="mb-12 text-center">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="absolute top-0 right-0 p-3 retro-border bg-white text-black retro-button"
          >
            <Cog6ToothIcon className={`w-6 h-6 ${showSettings ? 'rotate-90' : ''} transition-transform`} />
          </button>
          
          <div className="inline-block px-4 py-2 bg-black text-white font-retro text-[8px] mb-6 retro-border shadow-[4px_4px_0px_#fff]">
            ZERO PERSISTENCE
          </div>
          <h1 className="text-4xl md:text-5xl font-retro mb-4 tracking-tighter drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
            SNAPBIND
          </h1>
          <p className="font-retro text-[10px] opacity-70">RETRO EDITION • PDF BUILDER</p>

          {showSettings && (
            <div className="mt-8 p-6 bg-white border-4 border-black shadow-[8px_8px_0px_#000] inline-flex flex-col gap-6 text-left text-black">
              <div>
                <span className="font-retro text-[8px] block mb-4">PIXEL THEMES</span>
                <div className="flex flex-wrap gap-2">
                  {(['none', 'midnight', 'sunrise', 'forest', 'town'] as PixelTheme[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setActivePixelTheme(t)}
                      className={`px-3 py-2 font-retro text-[8px] retro-border retro-button transition-all ${activePixelTheme === t ? 'bg-black text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-retro text-[8px] block mb-4">COLOR FILTER</span>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={bgCustomColor} 
                    onChange={(e) => { setBgCustomColor(e.target.value); setActivePixelTheme('none'); }}
                    className="w-12 h-12 retro-border cursor-pointer"
                  />
                  <span className="font-retro text-[8px]">{bgCustomColor.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Drop Zone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files) Array.from(e.dataTransfer.files).forEach(processFile); }}
          className={`relative aspect-[21/7] bg-white text-black retro-border transition-all flex flex-col items-center justify-center
            ${dragActive ? 'scale-105 bg-yellow-50' : ''}
          `}
        >
          <div className="flex flex-col items-center text-center p-8">
            <div className="w-16 h-16 bg-black text-white flex items-center justify-center mb-6 retro-border shadow-none">
              <ClipboardDocumentCheckIcon className="w-8 h-8" />
            </div>
            <p className="font-retro text-[12px] mb-4">PASTE OR DROP IMAGES</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="font-retro text-[10px] text-blue-600 hover:bg-blue-50 px-4 py-2 retro-border retro-button"
            >
              BROWSE_FILES
            </button>
            <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => {
              if (e.target.files) Array.from(e.target.files).forEach(processFile);
            }} />
          </div>
        </div>

        {/* Grid */}
        {images.length > 0 && (
          <div className="mt-16 space-y-8 animate-in fade-in duration-500 pb-32">
            <div className="flex items-center justify-between px-4">
              <h2 className="font-retro text-[12px] flex items-center gap-3">
                <PhotoIcon className="w-6 h-6" />
                STAGED_PAGES ({images.length})
              </h2>
              <button onClick={() => setImages([])} className="font-retro text-[8px] text-red-500 hover:bg-red-50 px-4 py-2 retro-border retro-button flex items-center gap-2">
                <TrashIcon className="w-4 h-4" />
                BURN_STACK
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {images.map((img) => (
                <div key={img.id} className="relative group aspect-[3/4] bg-white retro-border transition-all hover:-translate-y-2">
                  <img src={img.url} className="w-full h-full object-cover p-2" alt="staged" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))} className="bg-white text-red-600 p-3 retro-border retro-button shadow-none">
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating Toolbar */}
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${images.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}`}>
          <div className="bg-white border-4 border-black px-6 py-6 shadow-[8px_8px_0px_#000] flex flex-wrap items-center justify-center gap-4 text-black">
            <button 
              onClick={() => setImages([])}
              className="p-4 text-black hover:text-red-500 transition-colors bg-slate-100 retro-border retro-button shadow-none"
              title="Clear Workspace"
            >
              <FireIcon className="w-6 h-6" />
            </button>
            
            <div className="w-1 h-12 bg-black opacity-20 mx-2 hidden sm:block" />
            
            <button
              onClick={handleBase64Export}
              disabled={isExportingBase64}
              className="flex flex-col items-center gap-2 px-6 py-3 bg-black text-white font-retro text-[8px] retro-button disabled:opacity-50"
            >
              <CommandLineIcon className="w-5 h-5" />
              BASE64
            </button>

            <button
              onClick={handlePreview}
              disabled={isPreviewing}
              className="flex flex-col items-center gap-2 px-6 py-3 bg-white text-black retro-border retro-button font-retro text-[8px] disabled:opacity-50"
            >
              <EyeIcon className="w-5 h-5" />
              PREVIEW
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="flex flex-col items-center gap-2 px-6 py-3 bg-white text-red-600 retro-border retro-button font-retro text-[8px] disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
              SAVE_PDF
            </button>

            <button
              onClick={handleDownloadZIP}
              disabled={isExportingZIP}
              className="flex flex-col items-center gap-2 px-6 py-3 bg-white text-blue-600 retro-border retro-button font-retro text-[8px] disabled:opacity-50"
            >
              <ArchiveBoxIcon className="w-5 h-5" />
              SAVE_ZIP
            </button>
          </div>
        </div>

        {/* Base64 Modal */}
        {base64Output && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in zoom-in duration-300">
            <div className="bg-white w-full max-w-2xl retro-border text-black overflow-hidden flex flex-col max-h-[85vh] shadow-[12px_12px_0px_#000]">
              <div className="p-6 border-b-4 border-black flex items-center justify-between">
                <div>
                  <h3 className="font-retro text-[14px]">DOCUMENT DATA</h3>
                  <p className="font-retro text-[8px] mt-2 opacity-60">RAW STRING OUTPUT</p>
                </div>
                <button onClick={() => { setBase64Output(null); setCopied(false); }} className="p-2 hover:bg-slate-100 retro-border retro-button shadow-none">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-hidden flex flex-col gap-6">
                <div className="relative flex-grow flex flex-col">
                  <textarea 
                    readOnly 
                    value={base64Output}
                    className="flex-grow w-full h-[250px] bg-slate-50 p-6 font-mono text-[10px] retro-border focus:outline-none resize-none break-all"
                  />
                </div>
                
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={copyToClipboard}
                    className="w-full py-5 bg-black text-white font-retro text-[12px] retro-button shadow-[4px_4px_0px_#fff] flex items-center justify-center gap-4 active:scale-95"
                  >
                    <DocumentDuplicateIcon className="w-6 h-6" />
                    COPY STRING
                  </button>
                  
                  {/* Copy Feedback */}
                  <div className={`transition-all duration-300 text-center ${copied ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                    <span className="font-retro text-[10px] text-green-600 flex items-center justify-center gap-2">
                      <CheckCircleIcon className="w-4 h-4" />
                      COPIED TO CLIPBOARD!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {images.length === 0 && (
          <div className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-12 max-w-2xl mx-auto">
            <div className="text-center p-6 bg-white/10 backdrop-blur-md retro-border">
              <PlusIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h4 className="font-retro text-[12px] mb-4">1. STAGE IMAGES</h4>
              <p className="font-retro text-[8px] leading-relaxed opacity-60">PASTE SCREENSHOTS OR DROP JPG/PNG FILES TO THE CANVAS.</p>
            </div>
            <div className="text-center p-6 bg-white/10 backdrop-blur-md retro-border">
              <CommandLineIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h4 className="font-retro text-[12px] mb-4">2. EXPORT DATA</h4>
              <p className="font-retro text-[8px] leading-relaxed opacity-60">DOWNLOAD AS PDF, ZIP, OR GET THE RAW BASE64 STRING.</p>
            </div>
          </div>
        )}

        <footer className={`mt-32 text-center font-retro text-[8px] tracking-[0.4em] opacity-40`}>
          SNAPBIND • v2.0 • PIXEL EDITION
        </footer>
      </div>
    </div>
  );
}
