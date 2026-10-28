import * as TabsPrimitive from '@radix-ui/react-tabs'
import type * as React from 'react'

import { cn } from '@/shared/lib/utils'

// shadcn/ui Tabs (Radix): roving focus with arrow keys, ARIA tab pattern.
// Styled like the Figma: underlined active tab over a full-width rule.

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-3', className)} {...props} />
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('flex gap-8 overflow-x-auto border-b border-border', className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        '-mb-px shrink-0 border-b-2 border-transparent pb-3 text-base leading-4 font-bold whitespace-nowrap text-text-secondary transition-colors hover:text-foreground',
        'data-[state=active]:border-primary data-[state=active]:text-text-accent',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('pt-2', className)} {...props} />
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
