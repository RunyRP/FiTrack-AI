import { useEffect, useState } from 'react';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { App as CapApp } from '@capacitor/app';

// The URL where you will host your version.json and update zips
// Change this to your actual hosting URL
const UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/your-username/your-repo/main/update.json';

export const OTAUpdateHandler = () => {
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const checkUpdate = async () => {
      // Only run on native platforms
      if (!(window as any).Capacitor || (window as any).Capacitor.getPlatform() === 'web') {
        return;
      }

      try {
        console.log('Checking for OTA updates...');
        setStatus('Checking for updates...');

        // 1. Fetch the latest version info from your server
        const response = await fetch(UPDATE_CHECK_URL);
        if (!response.ok) throw new Error('Failed to fetch update info');
        
        const updateInfo = await response.json();
        // Expected format: { version: "1.0.1", url: "https://.../bundle.zip" }

        // 2. Get the current app version
        const currentBundle = await CapacitorUpdater.getLatest();
        const appInfo = await CapApp.getInfo();
        
        const currentVersion = currentBundle.version || appInfo.version;
        
        if (updateInfo.version !== currentVersion) {
          console.log(`New version found: ${updateInfo.version}. Downloading...`);
          setStatus(`Updating to ${updateInfo.version}...`);

          // 3. Download the update
          const update = await CapacitorUpdater.download({
            url: updateInfo.url,
            version: updateInfo.version,
          });

          // 4. Set the update to be applied
          // This will reload the app with the new bundle
          await CapacitorUpdater.set(update);
          console.log('Update applied successfully!');
        } else {
          console.log('App is up to date.');
          setStatus('');
        }
      } catch (err) {
        console.error('OTA Update error:', err);
        setStatus('');
      }
    };

    // Check on mount
    checkUpdate();

    // Also check when app comes back to foreground
    const listener = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        checkUpdate();
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  if (!status) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '12px',
      zIndex: 9999,
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      pointerEvents: 'none'
    }}>
      {status}
    </div>
  );
};
