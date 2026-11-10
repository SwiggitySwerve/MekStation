import { Button } from '@/components/ui/Button';
import { REPLAY_FIDELITY_RELOAD_REASON } from '@/types/gameplay/ReplayFidelityVersion';

/** Shared terminal presentation for lobby and spectator reader refusals. */
export function ReplayReloadRequired() {
  return (
    <div className="text-text-theme-primary mx-auto min-w-0 max-w-2xl space-y-4 px-4 py-8" role="alert">
      <p>{REPLAY_FIDELITY_RELOAD_REASON}</p>
      <Button onClick={() => window.location.reload()}>Reload</Button>
    </div>
  );
}
