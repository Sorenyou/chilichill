'use client';

import { useApp } from './store';
import { BootScreen } from './components/BootScreen';
import { TourMap } from './components/TourMap';
import { MessageWall } from './components/MessageWall';
import { AdminConsole } from './components/AdminConsole';
import { Composer } from './components/Composer';
import { LoginModal } from './components/LoginModal';
import { ShareModal } from './components/ShareModal';
import { Lightbox, Toast } from './components/Overlays';

export function Shell() {
  const { booted, screen } = useApp();
  const showPanes = screen !== 'admin';

  return (
    <div className="crt">
      {!booted && <BootScreen />}

      {showPanes && (
        <div className="panes">
          <TourMap />
          <MessageWall />
        </div>
      )}

      {screen === 'admin' && <AdminConsole />}

      <Composer />
      <LoginModal />
      <ShareModal />
      <Lightbox />
      <Toast />
    </div>
  );
}
