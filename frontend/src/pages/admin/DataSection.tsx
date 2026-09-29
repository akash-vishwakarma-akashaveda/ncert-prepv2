import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Wand2, ShieldCheck, Upload, Link2, Unlink } from 'lucide-react';
import { CurriculumService } from '../../services/content';
import { VideoService } from '../../services/videos';
import { AdminClassNode, missingRecords } from './adminTree';
import { Card, Notify, SectionHeader, inputClass, primaryButton, secondaryButton } from './adminUi';

interface DataSectionProps {
  tree: AdminClassNode[];
  videoCount: number;
  onRefreshCatalog: () => Promise<void>;
  notify: Notify;
}

export const DataSection: React.FC<DataSectionProps> = ({ tree, videoCount, onRefreshCatalog, notify }) => {
  const [busy, setBusy] = useState<'records' | null>(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const missing = missingRecords(tree);
  const missingCount = missing.classes.length + missing.subjects.length + missing.chapters.length;

  const [linkedSheetUrl, setLinkedSheetUrl] = useState<string | null>(null);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [linkingSheet, setLinkingSheet] = useState(false);

  useEffect(() => {
    VideoService.getLinkedSheetUrl().then(setLinkedSheetUrl).catch(() => undefined);
  }, []);

  const linkSheet = async () => {
    if (!sheetUrlInput.trim()) return;
    setLinkingSheet(true);
    try {
      const result = await VideoService.syncFromSheetUrl(sheetUrlInput.trim());
      await onRefreshCatalog();
      setLinkedSheetUrl(sheetUrlInput.trim());
      setSheetUrlInput('');
      notify(`Linked and synced: ${result.created} new, ${result.updated} updated, ${result.skipped} unchanged. It'll auto-resync every 10 min.`);
    } catch (err) {
      notify((err as Error).message || 'Failed to link this sheet.', 'error');
    } finally {
      setLinkingSheet(false);
    }
  };

  const unlinkSheet = async () => {
    await VideoService.unlinkSheetUrl().catch(() => undefined);
    setLinkedSheetUrl(null);
    notify('Sheet unlinked. Auto-sync stopped.');
  };

  const syncLinkedSheetNow = async () => {
    if (!linkedSheetUrl) return;
    setLinkingSheet(true);
    try {
      const result = await VideoService.syncFromSheetUrl(linkedSheetUrl);
      await onRefreshCatalog();
      notify(`Synced: ${result.created} new, ${result.updated} updated, ${result.skipped} unchanged.`);
    } catch (err) {
      notify((err as Error).message || 'Failed to sync this sheet.', 'error');
    } finally {
      setLinkingSheet(false);
    }
  };

  const createRecords = async () => {
    setBusy('records');
    try {
      const count = await CurriculumService.saveMany(missing);
      await onRefreshCatalog();
      notify(`Created ${count} records.`);
    } catch (err) {
      notify((err as Error).message || 'Failed to create records.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingExcel(true);
    try {
      const result = await VideoService.syncFromExcel(file);
      await onRefreshCatalog();
      const summary = `${result.created} new, ${result.updated} updated, ${result.skipped} unchanged`;
      if (result.errors.length > 0) {
        notify(`Synced with ${result.errors.length} row error(s): ${summary}. First: ${result.errors[0]}`, 'error');
      } else {
        notify(`Synced from Excel: ${summary}.`);
      }
    } catch (err) {
      notify((err as Error).message || 'Failed to sync from Excel.', 'error');
    } finally {
      setUploadingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Data & Sync" description="Backend status, content sync and admin access." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E2233]">Backend</h3>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#E7F7F1] text-[#0B7A67]">AWS (Postgres)</span>
          </div>
          <p className="text-xs text-[#6B7280]">
            Everything — auth, profiles, the video catalog, curriculum records, progress, XP, leaderboard, doubts,
            feedback, platform settings and analytics — runs on AWS (Postgres via RDS). Note attachments still need
            S3 configured on the backend before uploads work.
          </p>
        </Card>

        <Card className="p-5 space-y-2">
          <h3 className="text-sm font-extrabold text-[#1E2233]">Catalog</h3>
          <p className="text-xs text-[#6B7280]">
            {videoCount} videos across {tree.length} classes. Upload the master Excel sheet below, or run the Google
            Apps Script sync (<code>NCERT Prep → Sync videos to backend</code>) from the sheet itself — either way the
            sync never changes a video's visibility, only its content.
          </p>
          <div className="flex flex-wrap gap-2">
            <input ref={excelInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
            <button onClick={() => excelInputRef.current?.click()} disabled={uploadingExcel} className={primaryButton}>
              <Upload className="w-3.5 h-3.5" /> {uploadingExcel ? 'Syncing…' : 'Upload Excel'}
            </button>
            <button onClick={() => onRefreshCatalog().then(() => notify('Catalog reloaded.'))} className={secondaryButton}>
              <RefreshCw className="w-3.5 h-3.5" /> Reload catalog
            </button>
          </div>

          <div className="pt-3 border-t border-[#E3E5EC] space-y-2">
            <p className="text-xs font-extrabold text-[#1E2233]">Live Google Sheet link</p>
            {linkedSheetUrl ? (
              <>
                <p className="text-[11px] text-[#6B7280] break-all">{linkedSheetUrl}</p>
                <p className="text-[11px] text-[#6B7280]">Auto-resyncs every 10 minutes.</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={syncLinkedSheetNow} disabled={linkingSheet} className={secondaryButton}>
                    <RefreshCw className="w-3.5 h-3.5" /> {linkingSheet ? 'Syncing…' : 'Sync now'}
                  </button>
                  <button onClick={unlinkSheet} className={secondaryButton}>
                    <Unlink className="w-3.5 h-3.5" /> Unlink
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] text-[#6B7280]">
                  Paste a Google Sheet link (shared as "Anyone with the link can view") to sync it now and keep it
                  syncing automatically, without running the Apps Script.
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={sheetUrlInput}
                    onChange={(e) => setSheetUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className={`${inputClass} flex-1 min-w-[220px]`}
                  />
                  <button onClick={linkSheet} disabled={linkingSheet || !sheetUrlInput.trim()} className={primaryButton}>
                    <Link2 className="w-3.5 h-3.5" /> {linkingSheet ? 'Linking…' : 'Link sheet'}
                  </button>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-extrabold text-[#1E2233]">Curriculum records</h3>
          <p className="text-xs text-[#6B7280]">
            {missingCount > 0
              ? `${missingCount} classes, subjects or chapters exist only in video rows. Create records to rename, reorder or hide them.`
              : 'Every class, subject and chapter has an editable record.'}
          </p>
          <button onClick={createRecords} disabled={busy !== null || missingCount === 0} className={primaryButton}>
            <Wand2 className="w-3.5 h-3.5" /> {busy === 'records' ? 'Creating…' : 'Create missing records'}
          </button>
        </Card>
      </div>

      <Card className="p-5 space-y-2">
        <h3 className="text-sm font-extrabold text-[#1E2233] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#12A594]" /> Admin access
        </h3>
        <p className="text-xs text-[#6B7280]">
          Admins are accounts whose role is <code>ADMIN</code> in the Postgres <code>User</code> table. Grant or
          promote an admin by running <code>npm run seed:admin -- &lt;email&gt; &lt;password&gt;</code> in{' '}
          <code>prep_ncert/backend</code> — students cannot grant themselves access from the app.
        </p>
      </Card>
    </div>
  );
};
