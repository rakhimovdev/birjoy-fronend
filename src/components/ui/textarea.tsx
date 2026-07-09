import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[112px] w-full rounded-[1.15rem] border border-border/70 bg-card/78 px-4 py-3 text-[0.95rem] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] ring-offset-background backdrop-blur-sm placeholder:text-muted-foreground/90 focus-visible:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/90 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
