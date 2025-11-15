import React from 'react';
import { Upload } from 'lucide-react';
import { motion } from 'framer-motion';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  fileName: string;
  loading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  fileName,
  loading,
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/40 backdrop-blur-sm rounded-xl shadow-xl p-6 md:p-8 mb-8 border border-slate-700/50"
    >
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-600/50 rounded-xl p-12 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-300 group">
        <motion.div
          animate={loading ? { rotate: 360 } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Upload className="w-16 h-16 text-emerald-400 mb-4 group-hover:text-emerald-300 transition-colors" />
        </motion.div>
        <span className="text-lg font-semibold text-white mb-2">
          {fileName || 'Drop your data file here or click to browse'}
        </span>
        <span className="text-sm text-slate-400">
          Supports CSV and Excel (.xlsx, .xls)
        </span>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          disabled={loading}
        />
      </label>
    </motion.div>
  );
};

export default FileUpload;

