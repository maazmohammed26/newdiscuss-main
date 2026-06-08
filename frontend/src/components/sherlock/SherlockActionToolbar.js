import { Download, FileJson, FileSpreadsheet } from 'lucide-react';

export default function SherlockActionToolbar({ results, username }) {
  if (!results || results.length === 0) return null;

  const handleExportCsv = () => {
    const headers = ['Platform', 'Category', 'Status', 'URL'];
    const rows = results.map(r => [
      r.platform,
      r.category,
      r.status,
      r.url
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${username || 'sherlock'}_results.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    const jsonContent = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${username || 'sherlock'}_results.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest hidden sm:inline-block">Export</span>
      <button
        onClick={handleExportCsv}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-neutral-200 dark:border-neutral-700 discuss:border-white/10 text-neutral-700 dark:text-neutral-300 discuss:text-neutral-300 text-[12px] font-bold transition-colors"
        title="Download CSV"
      >
        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
        CSV
      </button>
      <button
        onClick={handleExportJson}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-neutral-200 dark:border-neutral-700 discuss:border-white/10 text-neutral-700 dark:text-neutral-300 discuss:text-neutral-300 text-[12px] font-bold transition-colors"
        title="Download JSON"
      >
        <FileJson className="w-4 h-4 text-blue-500 discuss:text-red-500" />
        JSON
      </button>
    </div>
  );
}
