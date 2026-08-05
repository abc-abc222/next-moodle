import { Skeleton, Surface } from "@/components/ui";
import { RevealTransition } from "@/components/app-shell/transitions";
import { PageFrame } from "@/components/app-shell/workspace-frame";

export function PageLoading({ label }: Readonly<{ label: string }>) {
  return (
    <RevealTransition>
      <PageFrame
        content={(
          <div aria-busy="true" aria-label={label} className="ui-page-stack grid gap-5" role="status">
            <span className="sr-only">{label}</span>
            <div className="ui-page-grid grid gap-4 md:grid-cols-2">
              <Surface><Skeleton className="ui-page-loading__panel h-56 w-full" /></Surface>
              <Surface><Skeleton className="ui-page-loading__panel h-56 w-full" /></Surface>
            </div>
          </div>
        )}
        header={<div aria-hidden className="ui-page-loading__heading grid max-w-xl gap-3"><Skeleton className="ui-page-loading__title h-9 w-3/5" /><Skeleton className="ui-page-loading__copy h-4 w-4/5" /></div>}
        mode="overview"
      />
    </RevealTransition>
  );
}
