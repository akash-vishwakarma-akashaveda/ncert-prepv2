import React, { useState } from 'react';
import { RefreshCw, Wand2, ShieldCheck } from 'lucide-react';
import { isFirebaseConfigured } from '../../services/firebase';
import { CurriculumService } from '../../services/content';
import { AdminClassNode, missingRecords } from './adminTree';
import { Card, Notify, SectionHeader, primaryButton, secondaryButton } from './adminUi';

interface DataSectionProps {
  tree: AdminClassNode[];
  videoCount: number;
  onRefreshCatalog: () => Promise<void>;
  notify: Notify;
}

export const DataSection: React.FC<DataSectionProps> = ({ tree, videoCount, onRefreshCatalog, notify }) => {
  const [busy, setBusy] = useState<'records' | null>(null);
  const missing = missingRecords(tree);
  const missingCount = missing.classes.length + missing.subjects.length + missing.chapters.length;

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

  return (
    <div className="space-y-6">
      <SectionHeader title="Data & Sync" description="Backend status, content sync and admin access." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E2233]">Backend</h3>
            <span
              className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                isFirebaseConfigured ? 'bg-[#E7F7F1] text-[#0B7A67]' : 'bg-[#FFF1D6] text-[#8A5A14]'
              }`}
            >
              {isFirebaseConfigured ? 'Live Firebase' : 'Demo mode'}
            </span>
          </div>
          <p className="text-xs text-[#6B7280]">
            {isFirebaseConfigured
              ? 'Changes are saved to Firestore and Storage and reach all students.'
              : 'No Firebase keys found. Everything is stored in this browser only, and files are limited to 1.5 MB.'}
          </p>
        </Card>

        <Card className="p-5 space-y-2">
          <h3 className="text-sm font-extrabold text-[#1E2233]">Catalog</h3>
          <p className="text-xs text-[#6B7280]">
            {videoCount} videos across {tree.length} classes. Videos normally arrive from the Google Sheet sync
            (<code>scripts/google-apps-script-sync.js</code>); the sync never changes visibility.
          </p>
          <button onClick={() => onRefreshCatalog().then(() => notify('Catalog reloaded.'))} className={secondaryButton}>
            <RefreshCw className="w-3.5 h-3.5" /> Reload catalog
          </button>
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
          Admins are users whose <code>users/&#123;uid&#125;.role</code> is <code>admin</code>. For security, roles can only be
          set in the Firebase Console (or with the Admin SDK); students cannot grant themselves access from the app.
        </p>
      </Card>
    </div>
  );
};
